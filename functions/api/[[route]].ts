// aimgrim API — Cloudflare Pages Functions (Hono). 배포 시 /api/* 로 서빙. env.DB = D1.
import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { hashPassword, verifyPassword, inviteCode, randomId } from '../_lib/crypto'
import {
  createSession, readSession, destroySession, sessionCookie, clearSessionCookie, type SessionRow,
} from '../_lib/session'

type Bindings = { DB: D1Database }
type Author = 'me' | 'mom' | 'dad'

const CONSENT_AGE = 14 // 만 14세 미만은 법정대리인 동의 필요 (개인정보보호법 §22조의2)

const app = new Hono<{ Bindings: Bindings }>().basePath('/api')

// ---------------- 공통 헬퍼 ----------------
function authorLabel(authorId: string, childId: string, parentKind: string | null): Author {
  if (authorId === childId) return 'me'
  return parentKind === 'dad' ? 'dad' : 'mom'
}

function ageFromBirthYear(birthYear: number): number {
  return new Date().getFullYear() - birthYear
}

interface MemberRow {
  id: string; family_id: string; role: string; parent_kind: string | null
  display_name: string; email: string | null; password_hash: string | null
  pin: string | null; birth_year: number | null; points: number; consent_at: number | null
}

async function loadMe(db: D1Database, session: SessionRow) {
  const member = await db
    .prepare('SELECT id, family_id, role, parent_kind, display_name, birth_year, points FROM members WHERE id = ?')
    .bind(session.member_id).first<MemberRow>()
  if (!member) return null
  const family = await db
    .prepare('SELECT id, name, invite_code FROM families WHERE id = ?')
    .bind(session.family_id).first<{ id: string; name: string; invite_code: string }>()
  const children = await db
    .prepare('SELECT id, display_name, birth_year, consent_at FROM members WHERE family_id = ? AND role = \'child\' ORDER BY created_at')
    .bind(session.family_id).all<{ id: string; display_name: string; birth_year: number | null; consent_at: number | null }>()

  return {
    authenticated: true as const,
    member: {
      id: member.id, name: member.display_name, role: member.role,
      parentKind: member.parent_kind,
    },
    family: family ? { id: family.id, name: family.name, inviteCode: family.invite_code } : null,
    children: children.results.map((c) => ({
      id: c.id, name: c.display_name, birthYear: c.birth_year,
      needsConsent: c.birth_year != null && ageFromBirthYear(c.birth_year) < CONSENT_AGE,
      hasConsent: c.consent_at != null,
    })),
  }
}

async function requireSession(db: D1Database, cookie: string | null): Promise<SessionRow | null> {
  return readSession(db, cookie)
}

// ---------------- 인증 ----------------

// 부모 가입 + 가족 생성
app.post('/auth/parent/signup', async (c) => {
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
  // 코드 충돌 회피(희박하지만 안전하게)
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

// 부모 로그인
app.post('/auth/parent/login', async (c) => {
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

// 자녀 추가 (부모 세션 필요, 만14세 미만이면 동의 필수)
app.post('/children', async (c) => {
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

// 초대코드로 가족/자녀 조회 (자녀 입장 화면용)
app.get('/join/:code', async (c) => {
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

// 자녀 입장 (초대코드 + 자녀 선택 + PIN)
app.post('/auth/child/login', async (c) => {
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

app.get('/me', async (c) => {
  const db = c.env.DB
  const session = await requireSession(db, c.req.header('Cookie') ?? null)
  if (!session) return c.json({ authenticated: false })
  const me = await loadMe(db, session)
  return c.json(me ?? { authenticated: false })
})

app.post('/auth/logout', async (c) => {
  await destroySession(c.env.DB, c.req.header('Cookie') ?? null)
  c.header('Set-Cookie', clearSessionCookie())
  return c.json({ ok: true })
})

// ---------------- 스냅샷 / 토글 ----------------

interface TaskRow {
  id: string; title: string; category: string; author_id: string; child_id: string
  parent_kind: string | null; points: number; time_label: string | null
  progress: number; progress_label: string | null; done: number | null; approved: number | null
}

// 데모 가족은 인증 없이 열람 가능(체험), 그 외 가족은 세션이 같은 가족이어야 함
app.get('/family/:familyId/snapshot', async (c) => {
  const familyId = c.req.param('familyId')
  const childId = c.req.query('childId') ?? 'mem_child'
  const db = c.env.DB

  if (familyId !== 'fam_demo') {
    const session = await requireSession(db, c.req.header('Cookie') ?? null)
    if (!session || session.family_id !== familyId) return c.json({ error: 'unauthorized' }, 401)
    if (session.role === 'child' && session.member_id !== childId) return c.json({ error: 'forbidden' }, 403)
  }

  const child = await db
    .prepare('SELECT display_name, points FROM members WHERE id = ? AND family_id = ? AND role = \'child\'')
    .bind(childId, familyId).first<{ display_name: string; points: number }>()
  if (!child) return c.json({ error: 'child_not_found' }, 404)

  const taskSql = `
    SELECT t.id, t.title, t.category, t.author_id, t.child_id, am.parent_kind,
           t.points, t.time_label, t.progress, t.progress_label, c.done, c.approved
    FROM tasks t
    JOIN members am ON am.id = t.author_id
    LEFT JOIN completions c ON c.task_id = t.id
    WHERE t.child_id = ? AND t.period = ?
    ORDER BY t.sort_order`

  const today = await db.prepare(taskSql).bind(childId, 'day').all<TaskRow>()
  const week = await db.prepare(taskSql).bind(childId, 'week').all<TaskRow>()
  const month = await db.prepare(taskSql).bind(childId, 'month').all<TaskRow>()
  const rewards = await db
    .prepare('SELECT id, title, emoji, tone, cost, saved FROM reward_goals WHERE child_id = ? ORDER BY sort_order')
    .bind(childId).all<{ id: string; title: string; emoji: string; tone: string; cost: number; saved: number }>()
  const cheer = await db
    .prepare('SELECT id, from_kind, message FROM encouragements WHERE child_id = ? ORDER BY created_at DESC')
    .bind(childId).all<{ id: string; from_kind: string; message: string }>()

  const mapTask = (r: TaskRow) => ({
    id: r.id, title: r.title, category: r.category,
    author: authorLabel(r.author_id, r.child_id, r.parent_kind),
    timeLabel: r.time_label ?? '', points: r.points,
    done: !!r.done, approved: !!r.approved,
    progress: r.progress, progressLabel: r.progress_label ?? '',
  })

  return c.json({
    child: { name: child.display_name, points: child.points },
    todayTasks: today.results.map(mapTask),
    weekGoals: week.results.map(mapTask),
    monthGoal: month.results.length ? mapTask(month.results[0]) : null,
    rewardGoals: rewards.results,
    encouragements: cheer.results.map((e) => ({ id: e.id, from: e.from_kind, message: e.message })),
  })
})

app.post('/tasks/:taskId/toggle', async (c) => {
  const taskId = c.req.param('taskId')
  const db = c.env.DB

  const task = await db
    .prepare('SELECT id, family_id, child_id, points FROM tasks WHERE id = ?')
    .bind(taskId).first<{ id: string; family_id: string; child_id: string; points: number }>()
  if (!task) return c.json({ error: 'task_not_found' }, 404)

  // 데모 외 가족은 세션 검증
  if (task.family_id !== 'fam_demo') {
    const session = await requireSession(db, c.req.header('Cookie') ?? null)
    if (!session || session.family_id !== task.family_id) return c.json({ error: 'unauthorized' }, 401)
  }

  const comp = await db.prepare('SELECT done FROM completions WHERE task_id = ?').bind(taskId).first<{ done: number }>()
  const wasDone = !!comp?.done
  const nextDone = !wasDone
  const delta = nextDone ? task.points : -task.points
  const now = Date.now()

  await db.batch([
    db.prepare(
      `INSERT INTO completions (task_id, done, approved, completed_at) VALUES (?, ?, 0, ?)
       ON CONFLICT(task_id) DO UPDATE SET done = excluded.done,
         completed_at = CASE WHEN excluded.done = 1 THEN excluded.completed_at ELSE NULL END`,
    ).bind(taskId, nextDone ? 1 : 0, nextDone ? now : null),
    db.prepare('UPDATE members SET points = MAX(0, points + ?) WHERE id = ?').bind(delta, task.child_id),
    db.prepare('INSERT INTO point_ledger (id, child_id, delta, reason, task_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(`pl_${now}_${taskId}`, task.child_id, delta, nextDone ? 'task_done' : 'task_undone', taskId, now),
  ])

  const updated = await db.prepare('SELECT points FROM members WHERE id = ?').bind(task.child_id).first<{ points: number }>()
  return c.json({ done: nextDone, points: updated?.points ?? 0, gained: nextDone ? task.points : 0 })
})

// ---------------- 일정 CRUD / 승인 / 격려 / 보상 ----------------

const CATEGORIES = new Set(['study', 'life', 'health', 'play'])
const PERIODS = new Set(['day', 'week', 'month'])

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

/** 세션이 해당 자녀(가족 내)를 다룰 권한이 있는지. parent=가족 내 모든 자녀, child=본인만. */
async function authChild(
  db: D1Database, cookie: string | null, childId: string,
): Promise<{ session: SessionRow; parentKind: string | null } | null> {
  const session = await readSession(db, cookie)
  if (!session) return null
  if (session.role === 'child' && session.member_id !== childId) return null
  const child = await db
    .prepare('SELECT id FROM members WHERE id = ? AND family_id = ? AND role = \'child\'')
    .bind(childId, session.family_id).first()
  if (!child) return null
  const me = await db.prepare('SELECT parent_kind FROM members WHERE id = ?').bind(session.member_id).first<{ parent_kind: string | null }>()
  return { session, parentKind: me?.parent_kind ?? null }
}

// 일정(할일/목표) 생성
app.post('/tasks', async (c) => {
  const db = c.env.DB
  const body = await c.req.json<{
    childId?: string; title?: string; category?: string; period?: string
    points?: number; timeLabel?: string; progress?: number; progressLabel?: string
  }>()
  const childId = body.childId ?? ''
  const auth = await authChild(db, c.req.header('Cookie') ?? null, childId)
  if (!auth) return c.json({ error: 'unauthorized' }, 401)

  const title = (body.title ?? '').trim()
  const category = body.category ?? 'life'
  const period = body.period ?? 'day'
  const points = Math.max(0, Math.min(1000, Math.round(Number(body.points ?? 10))))
  if (!title) return c.json({ error: 'missing_title' }, 400)
  if (!CATEGORIES.has(category) || !PERIODS.has(period)) return c.json({ error: 'invalid_field' }, 400)

  const now = Date.now()
  const id = randomId('task')
  const order = await db.prepare('SELECT COALESCE(MAX(sort_order),0)+1 AS n FROM tasks WHERE child_id = ? AND period = ?')
    .bind(childId, period).first<{ n: number }>()
  const progress = Math.max(0, Math.min(100, Math.round(Number(body.progress ?? 0))))

  await db.prepare(
    `INSERT INTO tasks (id, family_id, child_id, title, category, period, author_id, points, the_date, time_label, progress, progress_label, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, auth.session.family_id, childId, title, category, period, auth.session.member_id, points,
    period === 'day' ? todayStr() : null, (body.timeLabel ?? '').trim() || null,
    progress, (body.progressLabel ?? '').trim() || null, order?.n ?? 1, now,
  ).run()

  return c.json({ ok: true, id })
})

// 일정 수정
app.put('/tasks/:id', async (c) => {
  const db = c.env.DB
  const taskId = c.req.param('id')
  const task = await db.prepare('SELECT id, family_id, child_id, author_id, period FROM tasks WHERE id = ?')
    .bind(taskId).first<{ id: string; family_id: string; child_id: string; author_id: string; period: string }>()
  if (!task) return c.json({ error: 'task_not_found' }, 404)
  const auth = await authChild(db, c.req.header('Cookie') ?? null, task.child_id)
  if (!auth) return c.json({ error: 'unauthorized' }, 401)

  const body = await c.req.json<{ title?: string; category?: string; points?: number; timeLabel?: string; progress?: number; progressLabel?: string }>()
  const title = (body.title ?? '').trim()
  const category = body.category ?? 'life'
  if (!title || !CATEGORIES.has(category)) return c.json({ error: 'invalid_field' }, 400)
  const points = Math.max(0, Math.min(1000, Math.round(Number(body.points ?? 10))))
  const progress = Math.max(0, Math.min(100, Math.round(Number(body.progress ?? 0))))

  await db.prepare(
    'UPDATE tasks SET title = ?, category = ?, points = ?, time_label = ?, progress = ?, progress_label = ? WHERE id = ?',
  ).bind(title, category, points, (body.timeLabel ?? '').trim() || null, progress, (body.progressLabel ?? '').trim() || null, taskId).run()

  return c.json({ ok: true })
})

// 일정 삭제
app.delete('/tasks/:id', async (c) => {
  const db = c.env.DB
  const taskId = c.req.param('id')
  const task = await db.prepare('SELECT child_id FROM tasks WHERE id = ?').bind(taskId).first<{ child_id: string }>()
  if (!task) return c.json({ error: 'task_not_found' }, 404)
  const auth = await authChild(db, c.req.header('Cookie') ?? null, task.child_id)
  if (!auth) return c.json({ error: 'unauthorized' }, 401)

  await db.batch([
    db.prepare('DELETE FROM completions WHERE task_id = ?').bind(taskId),
    db.prepare('DELETE FROM tasks WHERE id = ?').bind(taskId),
  ])
  return c.json({ ok: true })
})

// 부모 승인 (완료한 할일을 부모가 확인)
app.post('/tasks/:id/approve', async (c) => {
  const db = c.env.DB
  const taskId = c.req.param('id')
  const session = await readSession(db, c.req.header('Cookie') ?? null)
  if (!session || session.role !== 'parent') return c.json({ error: 'unauthorized' }, 401)
  const task = await db.prepare('SELECT family_id FROM tasks WHERE id = ?').bind(taskId).first<{ family_id: string }>()
  if (!task || task.family_id !== session.family_id) return c.json({ error: 'forbidden' }, 403)

  await db.prepare(
    `INSERT INTO completions (task_id, done, approved, approved_at) VALUES (?, 1, 1, ?)
     ON CONFLICT(task_id) DO UPDATE SET approved = 1, approved_at = excluded.approved_at`,
  ).bind(taskId, Date.now()).run()
  return c.json({ ok: true })
})

// 부모 격려 작성
app.post('/encouragements', async (c) => {
  const db = c.env.DB
  const session = await readSession(db, c.req.header('Cookie') ?? null)
  if (!session || session.role !== 'parent') return c.json({ error: 'unauthorized' }, 401)
  const body = await c.req.json<{ childId?: string; message?: string }>()
  const childId = body.childId ?? ''
  const message = (body.message ?? '').trim()
  if (!message) return c.json({ error: 'missing_message' }, 400)
  const child = await db.prepare('SELECT id FROM members WHERE id = ? AND family_id = ? AND role = \'child\'')
    .bind(childId, session.family_id).first()
  if (!child) return c.json({ error: 'child_not_found' }, 404)
  const me = await db.prepare('SELECT parent_kind FROM members WHERE id = ?').bind(session.member_id).first<{ parent_kind: string | null }>()

  await db.prepare('INSERT INTO encouragements (id, child_id, from_id, from_kind, message, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(randomId('e'), childId, session.member_id, me?.parent_kind === 'dad' ? 'dad' : 'mom', message.slice(0, 300), Date.now()).run()
  return c.json({ ok: true })
})

// 보상 목표 생성 (자녀가 갖고 싶은 것)
app.post('/reward-goals', async (c) => {
  const db = c.env.DB
  const body = await c.req.json<{ childId?: string; title?: string; emoji?: string; tone?: string; cost?: number }>()
  const childId = body.childId ?? ''
  const auth = await authChild(db, c.req.header('Cookie') ?? null, childId)
  if (!auth) return c.json({ error: 'unauthorized' }, 401)
  const title = (body.title ?? '').trim()
  const cost = Math.max(1, Math.min(100000, Math.round(Number(body.cost ?? 100))))
  const tone = ['grape', 'apricot', 'mint'].includes(body.tone ?? '') ? body.tone! : 'mint'
  if (!title) return c.json({ error: 'missing_title' }, 400)

  const order = await db.prepare('SELECT COALESCE(MAX(sort_order),0)+1 AS n FROM reward_goals WHERE child_id = ?').bind(childId).first<{ n: number }>()
  await db.prepare('INSERT INTO reward_goals (id, child_id, title, emoji, tone, cost, saved, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)')
    .bind(randomId('rg'), childId, title, (body.emoji ?? '🎁').slice(0, 4) || '🎁', tone, cost, order?.n ?? 1, Date.now()).run()
  return c.json({ ok: true })
})

app.delete('/reward-goals/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const rg = await db.prepare('SELECT child_id FROM reward_goals WHERE id = ?').bind(id).first<{ child_id: string }>()
  if (!rg) return c.json({ error: 'not_found' }, 404)
  const auth = await authChild(db, c.req.header('Cookie') ?? null, rg.child_id)
  if (!auth) return c.json({ error: 'unauthorized' }, 401)
  await db.prepare('DELETE FROM reward_goals WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

export const onRequest = handle(app)
