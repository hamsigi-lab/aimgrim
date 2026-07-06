// 일정 도메인 — 스냅샷(오늘/주/월/이력/streak), 할일·목표 CRUD, 완료 토글, 부모 승인.
import { Hono } from 'hono'
import { randomId } from '../_lib/crypto'
import {
  type Bindings, type TaskRow, CATEGORIES, PERIODS, authorLabel, familyDate, maxPoints,
  requireSession, authChild, readSessionParent,
} from '../_lib/core'

export const scheduleRoutes = new Hono<{ Bindings: Bindings }>()

function mapScheduleItem(r: TaskRow) {
  return {
    id: r.id, title: r.title, category: r.category,
    author: authorLabel(r.author_id, r.child_id, r.parent_kind),
    timeLabel: r.time_label ?? '', points: r.points,
    done: !!r.done, approved: !!r.approved,
    progress: r.progress, progressLabel: r.progress_label ?? '',
    recur: r.recur ?? 'daily',
  }
}

// 특정 날짜의 하루 계획(할일 + 그날 완료 상태). 화살표로 날짜 이동 시 사용.
scheduleRoutes.get('/family/:familyId/day', async (c) => {
  const db = c.env.DB
  const familyId = c.req.param('familyId')
  const childId = c.req.query('childId') ?? 'mem_child'
  const date = c.req.query('date') ?? familyDate(familyId)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return c.json({ error: 'invalid_date' }, 400)

  if (familyId !== 'fam_demo') {
    const session = await requireSession(db, c.req.header('Cookie') ?? null)
    if (!session || session.family_id !== familyId) return c.json({ error: 'unauthorized' }, 401)
    if (session.role === 'child' && session.member_id !== childId) return c.json({ error: 'forbidden' }, 403)
  }

  const dow = new Date(date + 'T00:00:00Z').getUTCDay()
  const isWeekday = dow >= 1 && dow <= 5 ? 1 : 0
  const rows = await db.prepare(`
    SELECT t.id, t.title, t.category, t.author_id, t.child_id, am.parent_kind,
           t.points, t.time_label, t.progress, t.progress_label, t.recur, c.done, c.approved
    FROM tasks t JOIN members am ON am.id = t.author_id
    LEFT JOIN completions c ON c.task_id = t.id AND c.the_date = ?
    WHERE t.child_id = ? AND t.period = 'day'
      AND (t.recur = 'daily' OR (t.recur = 'weekdays' AND ? = 1) OR (t.recur = 'once' AND t.the_date = ?))
    ORDER BY t.sort_order`).bind(date, childId, isWeekday, date).all<TaskRow>()

  return c.json({ date, tasks: rows.results.map(mapScheduleItem) })
})

// 부모 대시보드용 — 가족 내 자녀별 오늘 요약
scheduleRoutes.get('/family/:familyId/overview', async (c) => {
  const db = c.env.DB
  const familyId = c.req.param('familyId')
  const session = await readSessionParent(db, c.req.header('Cookie') ?? null)
  if (!session || session.family_id !== familyId) return c.json({ error: 'unauthorized' }, 401)

  const date = familyDate(familyId)
  const kids = await db.prepare('SELECT id, display_name, points FROM members WHERE family_id = ? AND role = \'child\' ORDER BY created_at')
    .bind(familyId).all<{ id: string; display_name: string; points: number }>()

  const children = []
  for (const k of kids.results) {
    const total = await db.prepare('SELECT COUNT(*) AS n FROM tasks WHERE child_id = ? AND period = \'day\'').bind(k.id).first<{ n: number }>()
    const comp = await db.prepare(`
      SELECT COALESCE(SUM(c.done),0) AS done,
             COALESCE(SUM(CASE WHEN c.done = 1 AND c.approved = 0 THEN 1 ELSE 0 END),0) AS pending
      FROM completions c JOIN tasks t ON t.id = c.task_id
      WHERE t.child_id = ? AND t.period = 'day' AND c.the_date = ?`).bind(k.id, date).first<{ done: number; pending: number }>()
    children.push({
      id: k.id, name: k.display_name, points: k.points,
      todayTotal: total?.n ?? 0, todayDone: comp?.done ?? 0, pending: comp?.pending ?? 0,
    })
  }
  return c.json({ children })
})

// 데모 가족은 인증 없이 열람 가능(체험), 그 외 가족은 세션이 같은 가족이어야 함
scheduleRoutes.get('/family/:familyId/snapshot', async (c) => {
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

  const date = familyDate(familyId)
  const dow = new Date(date + 'T00:00:00Z').getUTCDay() // 0=일..6=토
  const isWeekday = dow >= 1 && dow <= 5 ? 1 : 0

  // 반복 규칙에 따라 오늘 보여줄 하루 할일만 선별
  const dayRows = await db.prepare(`
    SELECT t.id, t.title, t.category, t.author_id, t.child_id, am.parent_kind,
           t.points, t.time_label, t.progress, t.progress_label, t.recur, c.done, c.approved
    FROM tasks t JOIN members am ON am.id = t.author_id
    LEFT JOIN completions c ON c.task_id = t.id AND c.the_date = ?
    WHERE t.child_id = ? AND t.period = 'day'
      AND (t.recur = 'daily' OR (t.recur = 'weekdays' AND ? = 1) OR (t.recur = 'once' AND t.the_date = ?))
    ORDER BY t.sort_order`).bind(date, childId, isWeekday, date).all<TaskRow>()

  const goalSql = `
    SELECT t.id, t.title, t.category, t.author_id, t.child_id, am.parent_kind,
           t.points, t.time_label, t.progress, t.progress_label, NULL AS done, NULL AS approved
    FROM tasks t JOIN members am ON am.id = t.author_id
    WHERE t.child_id = ? AND t.period = ? ORDER BY t.sort_order`
  const week = await db.prepare(goalSql).bind(childId, 'week').all<TaskRow>()
  const month = await db.prepare(goalSql).bind(childId, 'month').all<TaskRow>()

  const rewards = await db
    .prepare('SELECT id, title, emoji, tone, cost, redeemed_at FROM reward_goals WHERE child_id = ? ORDER BY sort_order')
    .bind(childId).all<{ id: string; title: string; emoji: string; tone: string; cost: number; redeemed_at: number | null }>()
  const cheer = await db
    .prepare('SELECT id, from_kind, message, created_at FROM encouragements WHERE child_id = ? ORDER BY created_at DESC LIMIT 20')
    .bind(childId).all<{ id: string; from_kind: string; message: string; created_at: number }>()

  const hist = await db.prepare(`
    SELECT c.the_date AS d, COUNT(*) AS done FROM completions c
    JOIN tasks t ON t.id = c.task_id
    WHERE t.child_id = ? AND t.period = 'day' AND c.done = 1 GROUP BY c.the_date`).bind(childId).all<{ d: string; done: number }>()
  const history = hist.results.map((h) => ({ date: h.d, done: h.done }))

  const doneDates = new Set(history.filter((h) => h.done > 0).map((h) => h.date))
  let streak = 0
  const cur = new Date(date + 'T00:00:00Z')
  if (!doneDates.has(date)) cur.setUTCDate(cur.getUTCDate() - 1)
  for (let i = 0; i < 400; i++) {
    const ds = cur.toISOString().slice(0, 10)
    if (doneDates.has(ds)) { streak++; cur.setUTCDate(cur.getUTCDate() - 1) } else break
  }

  const mapTask = mapScheduleItem

  return c.json({
    today: date,
    streak,
    dayTaskCount: dayRows.results.length,
    history,
    child: { name: child.display_name, points: child.points },
    todayTasks: dayRows.results.map(mapTask),
    weekGoals: week.results.map(mapTask),
    monthGoal: month.results.length ? mapTask(month.results[0]) : null,
    rewardGoals: rewards.results.map((r) => ({
      id: r.id, title: r.title, emoji: r.emoji, tone: r.tone, cost: r.cost, redeemed: !!r.redeemed_at,
    })),
    encouragements: cheer.results.map((e) => ({ id: e.id, from: e.from_kind, message: e.message, createdAt: e.created_at })),
  })
})

// 완료 토글
scheduleRoutes.post('/tasks/:taskId/toggle', async (c) => {
  const taskId = c.req.param('taskId')
  const db = c.env.DB
  const task = await db
    .prepare('SELECT id, family_id, child_id, points, title FROM tasks WHERE id = ?')
    .bind(taskId).first<{ id: string; family_id: string; child_id: string; points: number; title: string }>()
  if (!task) return c.json({ error: 'task_not_found' }, 404)

  if (task.family_id !== 'fam_demo') {
    const auth = await authChild(db, c.req.header('Cookie') ?? null, task.child_id)
    if (!auth) return c.json({ error: 'unauthorized' }, 401)
  }

  // 완료 날짜: 기본은 오늘, 요청에 date가 있으면 그 날짜(단 미래는 선완료 방지)
  const today = familyDate(task.family_id)
  const body = await c.req.json<{ date?: string }>().catch(() => ({} as { date?: string }))
  let date = today
  if (body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    if (body.date > today) return c.json({ error: 'future_date' }, 400)
    date = body.date
  }
  const comp = await db.prepare('SELECT done FROM completions WHERE task_id = ? AND the_date = ?').bind(taskId, date).first<{ done: number }>()
  const wasDone = !!comp?.done
  const nextDone = !wasDone
  const delta = nextDone ? task.points : -task.points
  const now = Date.now()

  await db.batch([
    db.prepare(
      `INSERT INTO completions (task_id, the_date, done, approved, completed_at) VALUES (?, ?, ?, 0, ?)
       ON CONFLICT(task_id, the_date) DO UPDATE SET done = excluded.done,
         completed_at = CASE WHEN excluded.done = 1 THEN excluded.completed_at ELSE NULL END,
         approved = CASE WHEN excluded.done = 1 THEN completions.approved ELSE 0 END`,
    ).bind(taskId, date, nextDone ? 1 : 0, nextDone ? now : null),
    db.prepare('UPDATE members SET points = MAX(0, points + ?) WHERE id = ?').bind(delta, task.child_id),
    db.prepare('INSERT INTO point_ledger (id, child_id, delta, reason, task_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(randomId('pl'), task.child_id, delta, nextDone ? 'task_done' : 'task_undone', taskId, task.title, now),
  ])

  const updated = await db.prepare('SELECT points FROM members WHERE id = ?').bind(task.child_id).first<{ points: number }>()
  return c.json({ done: nextDone, points: updated?.points ?? 0, gained: nextDone ? task.points : 0 })
})

// 일정(할일/목표) 생성
scheduleRoutes.post('/tasks', async (c) => {
  const db = c.env.DB
  const body = await c.req.json<{
    childId?: string; title?: string; category?: string; period?: string
    points?: number; timeLabel?: string; progress?: number; progressLabel?: string; recur?: string
  }>()
  const childId = body.childId ?? ''
  const auth = await authChild(db, c.req.header('Cookie') ?? null, childId)
  if (!auth) return c.json({ error: 'unauthorized' }, 401)

  const title = (body.title ?? '').trim()
  const category = body.category ?? 'life'
  const period = body.period ?? 'day'
  if (!title) return c.json({ error: 'missing_title' }, 400)
  if (!CATEGORIES.has(category) || !PERIODS.has(period)) return c.json({ error: 'invalid_field' }, 400)
  const points = Math.max(0, Math.min(maxPoints(period), Math.round(Number(body.points ?? 10))))
  const recur = ['daily', 'weekdays', 'once'].includes(body.recur ?? '') ? body.recur! : 'daily'

  const now = Date.now()
  const id = randomId('task')
  const order = await db.prepare('SELECT COALESCE(MAX(sort_order),0)+1 AS n FROM tasks WHERE child_id = ? AND period = ?')
    .bind(childId, period).first<{ n: number }>()
  const progress = Math.max(0, Math.min(100, Math.round(Number(body.progress ?? 0))))

  await db.prepare(
    `INSERT INTO tasks (id, family_id, child_id, title, category, period, author_id, points, the_date, time_label, progress, progress_label, recur, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, auth.session.family_id, childId, title, category, period, auth.session.member_id, points,
    period === 'day' ? familyDate(auth.session.family_id) : null, (body.timeLabel ?? '').trim() || null,
    progress, (body.progressLabel ?? '').trim() || null, recur, order?.n ?? 1, now,
  ).run()

  return c.json({ ok: true, id })
})

// 일정 수정 (자녀는 본인 작성분만)
scheduleRoutes.put('/tasks/:id', async (c) => {
  const db = c.env.DB
  const taskId = c.req.param('id')
  const task = await db.prepare('SELECT id, family_id, child_id, author_id, period FROM tasks WHERE id = ?')
    .bind(taskId).first<{ id: string; family_id: string; child_id: string; author_id: string; period: string }>()
  if (!task) return c.json({ error: 'task_not_found' }, 404)
  const auth = await authChild(db, c.req.header('Cookie') ?? null, task.child_id)
  if (!auth) return c.json({ error: 'unauthorized' }, 401)
  if (auth.session.role === 'child' && task.author_id !== auth.session.member_id) return c.json({ error: 'forbidden' }, 403)

  const body = await c.req.json<{ title?: string; category?: string; points?: number; timeLabel?: string; progress?: number; progressLabel?: string; recur?: string }>()
  const title = (body.title ?? '').trim()
  const category = body.category ?? 'life'
  if (!title || !CATEGORIES.has(category)) return c.json({ error: 'invalid_field' }, 400)
  const points = Math.max(0, Math.min(maxPoints(task.period), Math.round(Number(body.points ?? 10))))
  const progress = Math.max(0, Math.min(100, Math.round(Number(body.progress ?? 0))))
  const recur = ['daily', 'weekdays', 'once'].includes(body.recur ?? '') ? body.recur! : 'daily'

  await db.prepare(
    'UPDATE tasks SET title = ?, category = ?, points = ?, time_label = ?, progress = ?, progress_label = ?, recur = ? WHERE id = ?',
  ).bind(title, category, points, (body.timeLabel ?? '').trim() || null, progress, (body.progressLabel ?? '').trim() || null, recur, taskId).run()

  return c.json({ ok: true })
})

// 일정 삭제 (지급된 별점 원복)
scheduleRoutes.delete('/tasks/:id', async (c) => {
  const db = c.env.DB
  const taskId = c.req.param('id')
  const task = await db.prepare('SELECT child_id, author_id FROM tasks WHERE id = ?').bind(taskId).first<{ child_id: string; author_id: string }>()
  if (!task) return c.json({ error: 'task_not_found' }, 404)
  const auth = await authChild(db, c.req.header('Cookie') ?? null, task.child_id)
  if (!auth) return c.json({ error: 'unauthorized' }, 401)
  if (auth.session.role === 'child' && task.author_id !== auth.session.member_id) return c.json({ error: 'forbidden' }, 403)

  const sum = await db.prepare('SELECT COALESCE(SUM(delta),0) AS s FROM point_ledger WHERE task_id = ?').bind(taskId).first<{ s: number }>()
  await db.batch([
    db.prepare('UPDATE members SET points = MAX(0, points - ?) WHERE id = ?').bind(sum?.s ?? 0, task.child_id),
    db.prepare('DELETE FROM point_ledger WHERE task_id = ?').bind(taskId),
    db.prepare('DELETE FROM completions WHERE task_id = ?').bind(taskId),
    db.prepare('DELETE FROM tasks WHERE id = ?').bind(taskId),
  ])
  return c.json({ ok: true })
})

// 부모 승인 (오늘 완료된 건만 — 칭찬 도장)
scheduleRoutes.post('/tasks/:id/approve', async (c) => {
  const db = c.env.DB
  const taskId = c.req.param('id')
  const session = await readSessionParent(db, c.req.header('Cookie') ?? null)
  if (!session) return c.json({ error: 'unauthorized' }, 401)
  const task = await db.prepare('SELECT family_id FROM tasks WHERE id = ?').bind(taskId).first<{ family_id: string }>()
  if (!task || task.family_id !== session.family_id) return c.json({ error: 'forbidden' }, 403)

  const date = familyDate(task.family_id)
  const comp = await db.prepare('SELECT done FROM completions WHERE task_id = ? AND the_date = ?').bind(taskId, date).first<{ done: number }>()
  if (!comp?.done) return c.json({ error: 'not_completed' }, 400)
  await db.prepare('UPDATE completions SET approved = 1, approved_at = ? WHERE task_id = ? AND the_date = ?')
    .bind(Date.now(), taskId, date).run()
  return c.json({ ok: true })
})
