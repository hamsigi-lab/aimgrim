// Google ID 토큰(JWT) 검증 — Google 공개키(JWKS)로 서명 검증 후 클레임 반환.
// 외부 시크릿 불필요(공개 인증서만 사용). Web Crypto RS256.

export interface GoogleClaims { sub: string; email: string; name?: string; picture?: string }

const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs'
interface Jwk { kid: string; [k: string]: unknown }
let cachedKeys: Jwk[] | null = null
let cachedAt = 0

async function getKeys(): Promise<Jwk[]> {
  const now = Date.now()
  if (cachedKeys && now - cachedAt < 3_600_000) return cachedKeys
  const res = await fetch(JWKS_URL)
  const data = await res.json<{ keys: Jwk[] }>()
  cachedKeys = data.keys
  cachedAt = now
  return cachedKeys
}

function b64urlBytes(s: string): Uint8Array {
  let t = s.replace(/-/g, '+').replace(/_/g, '/')
  while (t.length % 4) t += '='
  const bin = atob(t)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}
function b64urlStr(s: string): string { return new TextDecoder().decode(b64urlBytes(s)) }

export async function verifyGoogleIdToken(idToken: string, clientId: string): Promise<GoogleClaims | null> {
  try {
    const parts = idToken.split('.')
    if (parts.length !== 3) return null
    const header = JSON.parse(b64urlStr(parts[0])) as { alg?: string; kid?: string }
    if (header.alg !== 'RS256' || !header.kid) return null

    const jwk = (await getKeys()).find((k) => k.kid === header.kid)
    if (!jwk) return null
    const key = await crypto.subtle.importKey('jwk', jwk as unknown as JsonWebKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(parts[2]) as BufferSource, data as BufferSource)
    if (!ok) return null

    const p = JSON.parse(b64urlStr(parts[1])) as {
      iss?: string; aud?: string; exp?: number; sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string
    }
    if (p.iss !== 'accounts.google.com' && p.iss !== 'https://accounts.google.com') return null
    if (p.aud !== clientId) return null
    if (typeof p.exp !== 'number' || p.exp * 1000 < Date.now()) return null
    if (!p.sub || !p.email || p.email_verified !== true) return null
    return { sub: p.sub, email: p.email, name: p.name, picture: p.picture }
  } catch {
    return null
  }
}
