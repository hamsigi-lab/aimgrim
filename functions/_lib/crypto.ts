// 비밀번호 해시(PBKDF2) + 토큰/초대코드 생성. Web Crypto만 사용(외부 의존 없음).

const PBKDF2_ITERATIONS = 100_000

function toB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}
function fromB64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    256,
  )
}

/** "pbkdf2$iterations$saltB64$hashB64" 형태로 저장 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toB64(salt.buffer)}$${toB64(hash)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const iterations = Number(parts[1])
  const salt = fromB64(parts[2])
  const expected = parts[3]
  const hash = await pbkdf2(password, salt, iterations)
  // 상수시간 비교
  const a = toB64(hash)
  if (a.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

export function randomToken(): string {
  return [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** 혼동 없는 문자만(0/O, 1/I/L 제외)으로 6자리 초대코드 */
export function inviteCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('')
}

export function randomId(prefix: string): string {
  return `${prefix}_${randomToken().slice(0, 20)}`
}
