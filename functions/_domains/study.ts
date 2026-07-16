// 순공시간(순수 공부시간) 도메인 — 과목(색) + 학습 세션 기록/통계.
// 설계 원칙(딥리서치): 순위·경쟁 없음, '나의 기록·성취'로. 시간엔 별점 미지급.
import { Hono } from 'hono'
import { randomId } from '../_lib/crypto'
import { type Bindings, authChild, requireSession, familyDate } from '../_lib/core'

export const studyRoutes = new Hono<{ Bindings: Bindings }>()

const DEFAULT_SUBJECTS: [string, string][] = [
  ['수학', '#9A86E8'], ['영어', '#2FB79A'], ['국어', '#FF9A6B'],
  ['과학', '#FF7EA6'], ['사회', '#FFC94D'], ['기타', '#7FB2F0'],
]

interface SubjectRow { id: string; name: string; color: string }
interface SessionRow {
  id: string; subject_id: string | null; subject_name: string; color: string
  minutes: number; note: string | null; the_date: string; task_id: string | null; created_at: number
}

function iso(d: Date) { return d.toISOString().slice(0, 10) }
function addDays(dateISO: string, n: number) { const d = new Date(dateISO + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d) }

/** 자녀 소속 가족 확인 + 쓰기 권한 (데모 가족은 무인증 허용, 그 외는 authChild) */
async function authForChild(db: D1Database, cookie: string | null, childId: string): Promise<{ familyId: string } | null> {
  const m = await db.prepare("SELECT family_id FROM members WHERE id = ? AND role = 'child'").bind(childId).first<{ family_id: string }>()
  if (!m) return null
  if (m.family_id === 'fam_demo') return { familyId: 'fam_demo' }
  const auth = await authChild(db, cookie, childId)
  return auth ? { familyId: m.family_id } : null
}

// 과목 + 순공 통계 스냅샷 (오늘/주/월)
studyRoutes.get('/family/:familyId/study', async (c) => {
  const db = c.env.DB
  const familyId = c.req.param('familyId')
  const childId = c.req.query('childId') ?? 'mem_child'
  if (familyId !== 'fam_demo') {
    const session = await requireSession(db, c.req.header('Cookie') ?? null)
    if (!session || session.family_id !== familyId) return c.json({ error: 'unauthorized' }, 401)
    if (session.role === 'child' && session.member_id !== childId) return c.json({ error: 'forbidden' }, 403)
  }

  const date = c.req.query('date') && /^\d{4}-\d{2}-\d{2}$/.test(c.req.query('date')!) ? c.req.query('date')! : familyDate(familyId)

  // 과목 목록 — 없으면 기본 과목 시드 (실제 가족 자녀)
  let subs = (await db.prepare('SELECT id, name, color FROM subjects WHERE child_id = ? ORDER BY sort_order, created_at').bind(childId).all<SubjectRow>()).results
  if (subs.length === 0 && familyId !== 'fam_demo') {
    const now = Date.now()
    await db.batch(DEFAULT_SUBJECTS.map(([name, color], i) =>
      db.prepare('INSERT INTO subjects (id, family_id, child_id, name, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(randomId('sub'), familyId, childId, name, color, i + 1, now)))
    subs = (await db.prepare('SELECT id, name, color FROM subjects WHERE child_id = ? ORDER BY sort_order, created_at').bind(childId).all<SubjectRow>()).results
  }

  // 주(월~일)·월 범위
  const d = new Date(date + 'T00:00:00Z')
  const monOff = (d.getUTCDay() + 6) % 7
  const weekStart = addDays(date, -monOff)
  const weekEnd = addDays(weekStart, 6)
  const monthStart = date.slice(0, 8) + '01'
  const monthEnd = iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)))
  const rangeStart = weekStart < monthStart ? weekStart : monthStart
  const rangeEnd = weekEnd > monthEnd ? weekEnd : monthEnd

  const rows = (await db.prepare(
    'SELECT id, subject_id, subject_name, color, minutes, note, the_date, task_id, created_at FROM study_sessions WHERE child_id = ? AND the_date >= ? AND the_date <= ? ORDER BY created_at')
    .bind(childId, rangeStart, rangeEnd).all<SessionRow>()).results

  const mapSession = (r: SessionRow) => ({
    id: r.id, subjectId: r.subject_id, subjectName: r.subject_name, color: r.color,
    minutes: r.minutes, note: r.note ?? '', taskId: r.task_id, createdAt: r.created_at,
  })

  // 오늘
  const todaySessions = rows.filter((r) => r.the_date === date)
  const todayTotal = todaySessions.reduce((s, r) => s + r.minutes, 0)

  // 주 — 요일별 총합 + 과목별
  const weekDays = []
  let weekTotal = 0, weekMax = 0
  const today = familyDate(familyId)
  for (let i = 0; i < 7; i++) {
    const dd = addDays(weekStart, i)
    const day = rows.filter((r) => r.the_date === dd)
    const total = day.reduce((s, r) => s + r.minutes, 0)
    const bySub = new Map<string, { name: string; color: string; min: number }>()
    for (const r of day) {
      const e = bySub.get(r.subject_name) ?? { name: r.subject_name, color: r.color, min: 0 }
      e.min += r.minutes; bySub.set(r.subject_name, e)
    }
    weekTotal += total; weekMax = Math.max(weekMax, total)
    weekDays.push({ date: dd, isToday: dd === today, totalMin: total, bySubject: [...bySub.values()] })
  }

  // 월 — 날짜별 총합 (히트맵)
  const monthDays = []
  let monthTotal = 0, monthMax = 0
  for (let dd = monthStart; dd <= monthEnd; dd = addDays(dd, 1)) {
    const total = rows.filter((r) => r.the_date === dd).reduce((s, r) => s + r.minutes, 0)
    monthTotal += total; monthMax = Math.max(monthMax, total)
    monthDays.push({ date: dd, totalMin: total })
  }

  // 스트릭 — 순공 기록이 있는 연속 일수
  const dsetRows = (await db.prepare('SELECT DISTINCT the_date AS d FROM study_sessions WHERE child_id = ? AND minutes > 0').bind(childId).all<{ d: string }>()).results
  const dset = new Set(dsetRows.map((r) => r.d))
  let streak = 0, cur = date
  if (!dset.has(cur)) cur = addDays(cur, -1)
  for (let i = 0; i < 400 && dset.has(cur); i++) { streak++; cur = addDays(cur, -1) }

  return c.json({
    date,
    subjects: subs,
    today: { totalMin: todayTotal, sessions: todaySessions.map(mapSession) },
    week: { start: weekStart, end: weekEnd, total: weekTotal, maxMin: weekMax, days: weekDays },
    month: { label: date.slice(0, 7), start: monthStart, end: monthEnd, total: monthTotal, maxMin: monthMax, days: monthDays },
    streak,
  })
})

// 학습 세션 저장
studyRoutes.post('/study/sessions', async (c) => {
  const db = c.env.DB
  const body = await c.req.json<{ childId?: string; subjectId?: string; subjectName?: string; color?: string; minutes?: number; note?: string; taskId?: string; mode?: string; date?: string }>()
  const childId = body.childId ?? ''
  const ok = await authForChild(db, c.req.header('Cookie') ?? null, childId)
  if (!ok) return c.json({ error: 'unauthorized' }, 401)

  const minutes = Math.round(Number(body.minutes ?? 0))
  if (!(minutes >= 1 && minutes <= 600)) return c.json({ error: 'invalid_minutes' }, 400)
  const subjectName = (body.subjectName ?? '').trim().slice(0, 20) || '기타'
  const color = /^#[0-9A-Fa-f]{6}$/.test(body.color ?? '') ? body.color! : '#7FB2F0'
  const note = (body.note ?? '').trim().slice(0, 80) || null
  const mode = body.mode === 'pomodoro' ? 'pomodoro' : 'stopwatch'
  const date = body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : familyDate(ok.familyId)
  const now = Date.now()
  const id = randomId('ss')
  await db.prepare(
    'INSERT INTO study_sessions (id, family_id, child_id, subject_id, subject_name, color, minutes, note, the_date, task_id, mode, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, ok.familyId, childId, body.subjectId ?? null, subjectName, color, minutes, note, date, body.taskId ?? null, mode, now).run()
  return c.json({ ok: true, id })
})

// 세션 삭제
studyRoutes.delete('/study/sessions/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const s = await db.prepare('SELECT child_id FROM study_sessions WHERE id = ?').bind(id).first<{ child_id: string }>()
  if (!s) return c.json({ error: 'not_found' }, 404)
  if (!(await authForChild(db, c.req.header('Cookie') ?? null, s.child_id))) return c.json({ error: 'unauthorized' }, 401)
  await db.prepare('DELETE FROM study_sessions WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// 과목 추가
studyRoutes.post('/study/subjects', async (c) => {
  const db = c.env.DB
  const body = await c.req.json<{ childId?: string; name?: string; color?: string }>()
  const childId = body.childId ?? ''
  const ok = await authForChild(db, c.req.header('Cookie') ?? null, childId)
  if (!ok) return c.json({ error: 'unauthorized' }, 401)
  const name = (body.name ?? '').trim().slice(0, 20)
  if (!name) return c.json({ error: 'missing_name' }, 400)
  const color = /^#[0-9A-Fa-f]{6}$/.test(body.color ?? '') ? body.color! : '#7FB2F0'
  const order = (await db.prepare('SELECT COALESCE(MAX(sort_order),0)+1 AS n FROM subjects WHERE child_id = ?').bind(childId).first<{ n: number }>())?.n ?? 1
  const id = randomId('sub')
  await db.prepare('INSERT INTO subjects (id, family_id, child_id, name, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, ok.familyId, childId, name, color, order, Date.now()).run()
  return c.json({ ok: true, id })
})

// 과목 삭제 (기존 세션은 이름·색이 저장돼 있어 통계 유지)
studyRoutes.delete('/study/subjects/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const s = await db.prepare('SELECT child_id FROM subjects WHERE id = ?').bind(id).first<{ child_id: string }>()
  if (!s) return c.json({ error: 'not_found' }, 404)
  if (!(await authForChild(db, c.req.header('Cookie') ?? null, s.child_id))) return c.json({ error: 'unauthorized' }, 401)
  await db.prepare('DELETE FROM subjects WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})
