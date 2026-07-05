// 세션 = DB 토큰 + httpOnly 쿠키. (외부 시크릿 불필요)
import { randomToken } from './crypto'

export const SESSION_COOKIE = 'aimgrim_session'
const MAX_AGE_SEC = 60 * 60 * 24 * 30 // 30일

export interface SessionRow {
  token: string
  member_id: string
  family_id: string
  role: string
  expires_at: number
}

export async function createSession(
  db: D1Database,
  member: { id: string; family_id: string; role: string },
): Promise<string> {
  const token = randomToken()
  const now = Date.now()
  await db
    .prepare('INSERT INTO sessions (token, member_id, family_id, role, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(token, member.id, member.family_id, member.role, now, now + MAX_AGE_SEC * 1000)
    .run()
  return token
}

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

export async function readSession(db: D1Database, cookieHeader: string | null): Promise<SessionRow | null> {
  const token = parseCookies(cookieHeader)[SESSION_COOKIE]
  if (!token) return null
  const row = await db
    .prepare('SELECT token, member_id, family_id, role, expires_at FROM sessions WHERE token = ?')
    .bind(token)
    .first<SessionRow>()
  if (!row) return null
  if (row.expires_at < Date.now()) {
    await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
    return null
  }
  return row
}

export async function destroySession(db: D1Database, cookieHeader: string | null): Promise<void> {
  const token = parseCookies(cookieHeader)[SESSION_COOKIE]
  if (token) await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_SEC}`
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
}
