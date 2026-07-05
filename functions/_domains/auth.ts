// 인증 도메인 — 부모 가입/로그인, 자녀 추가(+동의), 초대코드 입장, me, 로그아웃.
import { Hono } from 'hono'
import { hashPassword, verifyPassword, inviteCode, randomId } from '../_lib/crypto'
import { createSession, sessionCookie, destroySession, clearSessionCookie, type SessionRow } from '../_lib/session'
import {
  type Bindings, type MemberRow, CONSENT_AGE, ageFromBirthYear, requireSession, loadMe,
} from '../_lib/core'

export const authRoutes = new Hono<{ Bindings: Bindings }>()

authRoutes.post('/auth/parent/signup', async (c) => {
  const db = c.env.DB
  const body = await c.req.json<{ email?: string; password?: string; name?: string; parentKind?: string; familyName?: string }>()
  const email = (body.email ?? '').trim().toLowerCase()
  const password = body.password ?? ''
  const name = (body.name ?? '').trim()
  const parentKind = body.parentKind === 'dad' ? 'dad' : 'mom'
  const familyName = (body.familyName ?? '').trim()

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return c.json({ error: 'invalid_email' }, 400)
  if (password.length < 6) return c.json({ error: 'weak_password' }, 400)
  if (!name || !familyName) return c.json({ error: 'missing_fields' }, 400)

  const existing = await db.prepare('SELECT id FROM members WHERE email = ?').bind(email).first()
  if (existing) return c.json({ error: 'email_taken' }, 409)

  const now = Date.now()
  const familyId = randomId('fam')
  const memberId = randomId('mem')
  let code = inviteCode()
  for (let i = 0; i < 5; i++) {
    const dup = await db.prepare('SELECT id FROM families WHERE invite_code = ?').bind(code).first()
    if (!dup) break
    code = inviteCode()
  }
  const pwHash = await hashPassword(password)

  await db.batch([
    db.prepare('INSERT INTO families (id, name, invite_code, created_at) VALUES (?, ?, ?, ?)').bind(familyId, familyName, code, now),
    db.prepare(
      'INSERT INTO members (id, family_id, role, parent_kind, display_name, email, password_hash, points, created_at) VALUES (?, ?, \'parent\', ?, ?, ?, ?, 0, ?)',
    ).bind(memberId, familyId, parentKind, name, email, pwHash, now),
  ])

  const token = await createSession(db, { id: memberId, family_id: familyId, role: 'parent' })
  c.header('Set-Cookie', sessionCookie(token))
  const session: SessionRow = { token, member_id: memberId, family_id: familyId, role: 'parent', expires_at: now }
  return c.json(await loadMe(db, session))
})

authRoutes.post('/auth/parent/login', async (c) => {
  const db = c.env.DB
  const body = await c.req.json<{ email?: string; password?: string }>()
  const email = (body.email ?? '').trim().toLowerCase()
  const password = body.password ?? ''

  const member = await db
    .prepare('SELECT id, family_id, role, password_hash FROM members WHERE email = ? AND role = \'parent\'')
    .bind(email).first<MemberRow>()
  if (!member || !member.password_hash || !(await verifyPassword(password, member.password_hash))) {
    return c.json({ error: 'invalid_credentials' }, 401)
  }
  const token = await createSession(db, { id: member.id, family_id: member.family_id, role: 'parent' })
  c.header('Set-Cookie', sessionCookie(token))
  const session: SessionRow = { token, member_id: member.id, family_id: member.family_id, role: 'parent', expires_at: Date.now() }
  return c.json(await loadMe(db, session))
})

authRoutes.post('/children', async (c) => {
  const db = c.env.DB
  const session = await requireSession(db, c.req.header('Cookie') ?? null)
  if (!session || session.role !== 'parent') return c.json({ error: 'unauthorized' }, 401)

  const body = await c.req.json<{ name?: string; birthYear?: number; consent?: boolean; pin?: string }>()
  const name = (body.name ?? '').trim()
  const birthYear = Number(body.birthYear)
  const pin = (body.pin ?? '').trim() || null

  if (!name) return c.json({ error: 'missing_name' }, 400)
  if (!Number.isInteger(birthYear) || birthYear < 1990 || birthYear > new Date().getFullYear()) {
    return c.json({ error: 'invalid_birth_year' }, 400)
  }
  const needsConsent = ageFromBirthYear(birthYear) < CONSENT_AGE
  if (needsConsent && body.consent !== true) return c.json({ error: 'consent_required' }, 400)

  const now = Date.now()
  const childId = randomId('mem')
  await db.prepare(
    'INSERT INTO members (id, family_id, role, display_name, pin, birth_year, points, consent_at, consent_by, created_at) VALUES (?, ?, \'child\', ?, ?, ?, 0, ?, ?, ?)',
  ).bind(childId, session.family_id, name, pin, birthYear, needsConsent ? now : null, needsConsent ? session.member_id : null, now).run()

  return c.json(await loadMe(db, session))
})

authRoutes.get('/join/:code', async (c) => {
  const db = c.env.DB
  const code = c.req.param('code').trim().toUpperCase()
  const family = await db.prepare('SELECT id, name FROM families WHERE invite_code = ?').bind(code).first<{ id: string; name: string }>()
  if (!family) return c.json({ error: 'invalid_code' }, 404)
  const children = await db
    .prepare('SELECT id, display_name, pin FROM members WHERE family_id = ? AND role = \'child\' ORDER BY created_at')
    .bind(family.id).all<{ id: string; display_name: string; pin: string | null }>()
  return c.json({
    family: { id: family.id, name: family.name },
    children: children.results.map((c2) => ({ id: c2.id, name: c2.display_name, hasPin: !!c2.pin })),
  })
})

authRoutes.post('/auth/child/login', async (c) => {
  const db = c.env.DB
  const body = await c.req.json<{ inviteCode?: string; childId?: string; pin?: string }>()
  const code = (body.inviteCode ?? '').trim().toUpperCase()
  const childId = body.childId ?? ''
  const pin = (body.pin ?? '').trim()

  const family = await db.prepare('SELECT id FROM families WHERE invite_code = ?').bind(code).first<{ id: string }>()
  if (!family) return c.json({ error: 'invalid_code' }, 404)
  const child = await db
    .prepare('SELECT id, family_id, role, pin FROM members WHERE id = ? AND family_id = ? AND role = \'child\'')
    .bind(childId, family.id).first<MemberRow>()
  if (!child) return c.json({ error: 'child_not_found' }, 404)
  if (child.pin && child.pin !== pin) return c.json({ error: 'invalid_pin' }, 401)

  const token = await createSession(db, { id: child.id, family_id: child.family_id, role: 'child' })
  c.header('Set-Cookie', sessionCookie(token))
  const session: SessionRow = { token, member_id: child.id, family_id: child.family_id, role: 'child', expires_at: Date.now() }
  return c.json(await loadMe(db, session))
})

authRoutes.get('/me', async (c) => {
  const db = c.env.DB
  const session = await requireSession(db, c.req.header('Cookie') ?? null)
  if (!session) return c.json({ authenticated: false })
  const me = await loadMe(db, session)
  return c.json(me ?? { authenticated: false })
})

authRoutes.post('/auth/logout', async (c) => {
  await destroySession(c.env.DB, c.req.header('Cookie') ?? null)
  c.header('Set-Cookie', clearSessionCookie())
  return c.json({ ok: true })
})
