// 일정 도메인 — 스냅샷(오늘/주/월/이력/streak), 할일·목표 CRUD, 완료 토글, 부모 승인.
import { Hono } from 'hono'
import { randomId } from '../_lib/crypto'
import {
  type Bindings, type TaskRow, CATEGORIES, PERIODS, authorLabel, familyDate, maxPoints,
  requireSession, authChild, readSessionParent, DAY_RECUR_SQL, dayRecurBinds, isWeekdayOf, dayBitOf,
  daysToMask, maskToDays, occurrencesInRange,
} from '../_lib/core'

export const scheduleRoutes = new Hono<{ Bindings: Bindings }>()

/** goalId가 같은 자녀의 주/월 목표면 그 값을, 아니면 null (빈 문자열=연결 해제) */
async function validGoalId(db: D1Database, goalId: string | undefined, childId: string): Promise<string | null> {
  if (!goalId) return null
  const g = await db.prepare("SELECT id FROM tasks WHERE id = ? AND child_id = ? AND period IN ('week','month')")
    .bind(goalId, childId).first()
  return g ? goalId : null
}

function mapScheduleItem(r: TaskRow) {
  return {
    id: r.id, title: r.title, category: r.category,
    author: authorLabel(r.author_id, r.child_id, r.parent_kind),
    timeLabel: r.time_label ?? '', points: r.points,
    done: !!r.done, approved: !!r.approved,
    progress: r.progress, progressLabel: r.progress_label ?? '',
    recur: r.recur ?? 'daily', recurDays: maskToDays(r.recur_days), goalId: r.goal_id ?? null,
    note: r.note ?? '', minutes: r.minutes ?? 0,
    startDate: r.start_date ?? null, endDate: r.end_date ?? null,
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
    // 같은 가족이면 형제 것도 읽기 허용(쓰기는 authChild로 본인만) — 서로 응원 공유
  }

  const isWeekday = isWeekdayOf(date)
  const rows = await db.prepare(`
    SELECT t.id, t.title, t.category, t.author_id, t.child_id, am.parent_kind,
           t.points, t.time_label, t.progress, t.progress_label, t.recur, t.recur_days, t.goal_id, t.start_date, t.end_date, c.done, c.approved, c.note, c.minutes
    FROM tasks t JOIN members am ON am.id = t.author_id
    LEFT JOIN completions c ON c.task_id = t.id AND c.the_date = ?
    WHERE t.child_id = ? AND t.period = 'day' AND substr(t.id,1,3) <> 'gp_' AND ${DAY_RECUR_SQL}
    ORDER BY t.sort_order`).bind(date, childId, ...dayRecurBinds(date, isWeekday, dayBitOf(date))).all<TaskRow>()

  return c.json({ date, tasks: rows.results.map(mapScheduleItem) })
})

// 이번주 하루계획 — 월~일 7일치를 날짜별로 (주간 보기 인라인 입력용)
scheduleRoutes.get('/family/:familyId/week', async (c) => {
  const db = c.env.DB
  const familyId = c.req.param('familyId')
  const childId = c.req.query('childId') ?? 'mem_child'
  const start = c.req.query('start') ?? familyDate(familyId) // 월요일 ISO
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return c.json({ error: 'invalid_date' }, 400)

  if (familyId !== 'fam_demo') {
    const session = await requireSession(db, c.req.header('Cookie') ?? null)
    if (!session || session.family_id !== familyId) return c.json({ error: 'unauthorized' }, 401)
    // 같은 가족이면 형제 것도 읽기 허용(쓰기는 authChild로 본인만) — 서로 응원 공유
  }

  const today = familyDate(familyId)
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + i)
    const date = d.toISOString().slice(0, 10)
    const rows = await db.prepare(`
      SELECT t.id, t.title, t.category, t.author_id, t.child_id, am.parent_kind,
             t.points, t.time_label, t.progress, t.progress_label, t.recur, t.recur_days, t.goal_id, t.start_date, t.end_date, c.done, c.approved, c.note, c.minutes
      FROM tasks t JOIN members am ON am.id = t.author_id
      LEFT JOIN completions c ON c.task_id = t.id AND c.the_date = ?
      WHERE t.child_id = ? AND t.period = 'day' AND substr(t.id,1,3) <> 'gp_' AND ${DAY_RECUR_SQL}
      ORDER BY t.sort_order`).bind(date, childId, ...dayRecurBinds(date, isWeekdayOf(date), dayBitOf(date))).all<TaskRow>()
    days.push({ date, isToday: date === today, tasks: rows.results.map(mapScheduleItem) })
  }
  return c.json({ start, today, days })
})

// 가족 대시보드 — 자녀별 오늘 요약 (부모 + 자녀 모두 열람: 형제끼리 함께 응원)
scheduleRoutes.get('/family/:familyId/overview', async (c) => {
  const db = c.env.DB
  const familyId = c.req.param('familyId')
  const session = await requireSession(db, c.req.header('Cookie') ?? null)
  if (!session || session.family_id !== familyId) return c.json({ error: 'unauthorized' }, 401)

  const date = familyDate(familyId)
  const isWk = isWeekdayOf(date), dBit = dayBitOf(date)
  const kids = await db.prepare('SELECT id, display_name, points FROM members WHERE family_id = ? AND role = \'child\' ORDER BY created_at')
    .bind(familyId).all<{ id: string; display_name: string; points: number }>()

  const children = []
  for (const k of kids.results) {
    // 오늘 할일 (gp_ 제외·반복 규칙 적용)
    const day = await db.prepare(`
      SELECT COUNT(*) AS total,
             COALESCE(SUM(CASE WHEN c.done = 1 THEN 1 ELSE 0 END),0) AS done,
             COALESCE(SUM(CASE WHEN c.done = 1 AND c.approved = 0 THEN 1 ELSE 0 END),0) AS pending
      FROM tasks t LEFT JOIN completions c ON c.task_id = t.id AND c.the_date = ?
      WHERE t.child_id = ? AND t.period = 'day' AND substr(t.id,1,3) <> 'gp_' AND ${DAY_RECUR_SQL}`)
      .bind(date, k.id, ...dayRecurBinds(date, isWk, dBit)).first<{ total: number; done: number; pending: number }>()
    // 오늘 목표 (기간에 든 목표 수 / 오늘 체크한 수)
    const goals = await db.prepare("SELECT start_date, end_date FROM tasks WHERE child_id = ? AND period IN ('week','month')")
      .bind(k.id).all<{ start_date: string | null; end_date: string | null }>()
    const goalTotal = goals.results.filter((g) => (!g.start_date || g.start_date <= date) && (!g.end_date || g.end_date >= date)).length
    const goalDone = (await db.prepare("SELECT COUNT(*) AS n FROM completions c JOIN tasks t ON t.id = c.task_id WHERE t.child_id = ? AND c.the_date = ? AND c.done = 1 AND substr(t.id,1,3) = 'gp_'")
      .bind(k.id, date).first<{ n: number }>())?.n ?? 0
    // 오늘 순공
    const studyMin = (await db.prepare('SELECT COALESCE(SUM(minutes),0) AS m FROM study_sessions WHERE child_id = ? AND the_date = ?').bind(k.id, date).first<{ m: number }>())?.m ?? 0
    // 누적 순공 목표(첫 목표)
    const sg = await db.prepare('SELECT target_min, start_date, end_date FROM study_goals WHERE child_id = ? ORDER BY created_at LIMIT 1').bind(k.id).first<{ target_min: number; start_date: string; end_date: string }>()
    let studyGoal = null
    if (sg) {
      const acc = (await db.prepare('SELECT COALESCE(SUM(minutes),0) AS m FROM study_sessions WHERE child_id = ? AND the_date >= ? AND the_date <= ?').bind(k.id, sg.start_date, sg.end_date).first<{ m: number }>())?.m ?? 0
      studyGoal = { accMin: acc, targetMin: sg.target_min, progress: Math.min(100, Math.round((acc / sg.target_min) * 100)) }
    }
    children.push({
      id: k.id, name: k.display_name, points: k.points,
      todayTotal: day?.total ?? 0, todayDone: day?.done ?? 0, pending: day?.pending ?? 0,
      goalTotal, goalDone, studyMin, studyGoal,
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
    // 같은 가족이면 형제 것도 읽기 허용(쓰기는 authChild로 본인만) — 서로 응원 공유
  }

  const child = await db
    .prepare('SELECT display_name, points FROM members WHERE id = ? AND family_id = ? AND role = \'child\'')
    .bind(childId, familyId).first<{ display_name: string; points: number }>()
  if (!child) return c.json({ error: 'child_not_found' }, 404)

  const date = familyDate(familyId)

  // 반복 규칙(시작일 기준)에 따라 오늘 보여줄 하루 할일만 선별
  const dayRows = await db.prepare(`
    SELECT t.id, t.title, t.category, t.author_id, t.child_id, am.parent_kind,
           t.points, t.time_label, t.progress, t.progress_label, t.recur, t.recur_days, t.goal_id, t.start_date, t.end_date, c.done, c.approved, c.note, c.minutes
    FROM tasks t JOIN members am ON am.id = t.author_id
    LEFT JOIN completions c ON c.task_id = t.id AND c.the_date = ?
    WHERE t.child_id = ? AND t.period = 'day' AND substr(t.id,1,3) <> 'gp_' AND ${DAY_RECUR_SQL}
    ORDER BY t.sort_order`).bind(date, childId, ...dayRecurBinds(date, isWeekdayOf(date), dayBitOf(date))).all<TaskRow>()

  const goalSql = `
    SELECT t.id, t.title, t.category, t.author_id, t.child_id, am.parent_kind,
           t.points, t.time_label, t.progress, t.progress_label, NULL AS recur, NULL AS recur_days, t.goal_id, t.start_date, t.end_date, NULL AS done, NULL AS approved
    FROM tasks t JOIN members am ON am.id = t.author_id
    WHERE t.child_id = ? AND t.period = ? ORDER BY t.sort_order`
  const week = await db.prepare(goalSql).bind(childId, 'week').all<TaskRow>()
  const month = await db.prepare(goalSql).bind(childId, 'month').all<TaskRow>()

  // 각 목표에 '숨은 매일 실천'(gp_)을 보장 → 계획 탭에서 목표를 매일 체크(진행률 롤업).
  // 리스트엔 안 보이고(위 쿼리에서 제외) 목표 행의 체크로만 쓰인다. 제목·기간은 목표에 맞춰 동기화.
  const allGoals = [...week.results, ...month.results]
  if (allGoals.length) {
    const now = Date.now()
    const stmts = []
    for (const g of allGoals) {
      const pid = 'gp_' + g.id
      const gpStart = g.start_date ?? date
      stmts.push(db.prepare(
        `INSERT OR IGNORE INTO tasks (id, family_id, child_id, title, category, period, author_id, points, the_date, time_label, progress, progress_label, recur, recur_days, goal_id, start_date, end_date, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, 'day', ?, 10, ?, NULL, 0, NULL, 'daily', NULL, ?, NULL, ?, 0, ?)`)
        .bind(pid, familyId, childId, g.title, g.category, g.author_id, gpStart, g.id, g.end_date ?? null, now))
      stmts.push(db.prepare('UPDATE tasks SET title = ?, category = ?, the_date = ?, end_date = ? WHERE id = ?')
        .bind(g.title, g.category, gpStart, g.end_date ?? null, pid))
    }
    await db.batch(stmts)
  }
  // 오늘 목표 체크 상태 + 기록 메모
  const gpRows = (await db.prepare(
    "SELECT c.task_id AS tid, c.note AS note FROM completions c JOIN tasks t ON t.id = c.task_id WHERE t.child_id = ? AND c.the_date = ? AND c.done = 1 AND substr(t.id,1,3) = 'gp_'")
    .bind(childId, date).all<{ tid: string; note: string | null }>()).results
  const gpDone = new Set(gpRows.map((r) => r.tid))
  const gpNote = new Map(gpRows.map((r) => [r.tid, r.note ?? '']))

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

  // 목표 자동 진행률: 연결된 하루 할일의 (기간 내) 완료 / 발생 비율
  const linked = await db.prepare("SELECT id, goal_id, recur, the_date, recur_days, end_date FROM tasks WHERE child_id = ? AND period = 'day' AND goal_id IS NOT NULL")
    .bind(childId).all<{ id: string; goal_id: string; recur: string; the_date: string | null; recur_days: number | null; end_date: string | null }>()
  const linkedComp = await db.prepare(`
    SELECT c.task_id AS tid, c.the_date AS d FROM completions c
    JOIN tasks t ON t.id = c.task_id
    WHERE t.child_id = ? AND t.goal_id IS NOT NULL AND c.done = 1`).bind(childId).all<{ tid: string; d: string }>()

  const monthStart = date.slice(0, 8) + '01'
  const md = new Date(date + 'T00:00:00Z')
  const monthEnd = new Date(Date.UTC(md.getUTCFullYear(), md.getUTCMonth() + 1, 0)).toISOString().slice(0, 10)
  const monOff = (md.getUTCDay() + 6) % 7
  const wkMon = new Date(md); wkMon.setUTCDate(md.getUTCDate() - monOff)
  const weekStart = wkMon.toISOString().slice(0, 10)
  const wkSun = new Date(wkMon); wkSun.setUTCDate(wkMon.getUTCDate() + 6)
  const weekEnd = wkSun.toISOString().slice(0, 10)

  function autoProgress(goalId: string, aStart: string, aEnd: string): number | null {
    const tasks = linked.results.filter((t) => t.goal_id === goalId)
    if (tasks.length === 0) return null
    let occ = 0
    for (const t of tasks) occ += occurrencesInRange(t.recur ?? 'daily', t.the_date ?? aStart, aStart, aEnd, t.recur_days ?? 0, t.end_date)
    if (occ === 0) return 0
    const ids = new Set(tasks.map((t) => t.id))
    const done = linkedComp.results.filter((c2) => ids.has(c2.tid) && c2.d >= aStart && c2.d <= aEnd).length
    return Math.min(100, Math.round((done / occ) * 100))
  }
  const mapGoal = (r: TaskRow, aStart: string, aEnd: string) => {
    const m = mapTask(r)
    const auto = autoProgress(r.id, aStart, aEnd)
    return auto === null ? m : { ...m, progress: auto, autoProgress: true }
  }

  // 하위 계획(목표에 연결된 하루 할일) — 목표별로 묶어 목표 탭에서 중첩 표시. c.done은 오늘 기준.
  const subRows = await db.prepare(`
    SELECT t.id, t.title, t.category, t.author_id, t.child_id, am.parent_kind,
           t.points, t.time_label, t.progress, t.progress_label, t.recur, t.recur_days, t.goal_id, t.start_date, t.end_date, c.done, c.approved, c.note, c.minutes
    FROM tasks t JOIN members am ON am.id = t.author_id
    LEFT JOIN completions c ON c.task_id = t.id AND c.the_date = ?
    WHERE t.child_id = ? AND t.period = 'day' AND t.goal_id IS NOT NULL AND substr(t.id,1,3) <> 'gp_'
    ORDER BY t.sort_order`).bind(date, childId).all<TaskRow>()
  const subByGoal = new Map<string, ReturnType<typeof mapTask>[]>()
  for (const r of subRows.results) {
    const gid = r.goal_id ?? ''
    const arr = subByGoal.get(gid) ?? []
    arr.push(mapTask(r)); subByGoal.set(gid, arr)
  }
  const mapGoalFull = (r: TaskRow, aStart: string, aEnd: string, period: 'week' | 'month') => {
    // 목표 자체 기간(시작~종료)이 있으면 그 기간으로 진행률·D-day 계산
    const hasRange = !!(r.start_date && r.end_date)
    const gs = hasRange ? r.start_date! : aStart
    const ge = hasRange ? r.end_date! : aEnd
    const dDay = r.end_date ? Math.ceil((Date.parse(r.end_date + 'T00:00:00Z') - Date.parse(date + 'T00:00:00Z')) / 86400000) : null
    return { ...mapGoal(r, gs, ge), period, subplans: subByGoal.get(r.id) ?? [], dDay, todayPracticeId: 'gp_' + r.id, todayDone: gpDone.has('gp_' + r.id), todayNote: gpNote.get('gp_' + r.id) ?? '' }
  }
  const goals = [
    ...week.results.map((r) => mapGoalFull(r, weekStart, weekEnd, 'week')),
    ...month.results.map((r) => mapGoalFull(r, monthStart, monthEnd, 'month')),
  ]

  return c.json({
    today: date,
    streak,
    dayTaskCount: dayRows.results.length,
    history,
    child: { name: child.display_name, points: child.points },
    todayTasks: dayRows.results.map(mapTask),
    goals,
    weekGoals: week.results.map((r) => mapGoal(r, weekStart, weekEnd)),
    monthGoal: month.results.length ? mapGoal(month.results[0], monthStart, monthEnd) : null,
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

  let points = (await db.prepare('SELECT points FROM members WHERE id = ?').bind(task.child_id).first<{ points: number }>())?.points ?? 0

  // 깜짝 상자: 오늘 계획을 '모두' 해낸 순간 가끔(하루 1회, 점차 줄임) 상징 보너스
  let surprise: { points: number; message: string } | null = null
  if (nextDone && date === today) {
    surprise = await maybeSurprise(db, task.child_id, today, now)
    if (surprise) points += surprise.points
  }

  return c.json({ done: nextDone, points, gained: nextDone ? task.points : 0, surprise })
})

const SURPRISE_MSGS = [
  '오늘 계획을 다 해냈어! 깜짝 선물이야 🎁',
  '스스로 끝까지 해낸 너, 정말 멋져 ✨',
  '와, 오늘도 완주! 작은 선물 받아 💝',
  '해낸 하루엔 깜짝 보너스 🌟',
]

// 오늘 모든 하루 할일을 완료했으면 확률적으로(점감) 깜짝 보너스 지급
async function maybeSurprise(db: D1Database, childId: string, today: string, now: number): Promise<{ points: number; message: string } | null> {
  const isWeekday = isWeekdayOf(today)
  const agg = await db.prepare(`
    SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN c.done = 1 THEN 1 ELSE 0 END),0) AS done
    FROM tasks t LEFT JOIN completions c ON c.task_id = t.id AND c.the_date = ?
    WHERE t.child_id = ? AND t.period = 'day' AND substr(t.id,1,3) <> 'gp_' AND ${DAY_RECUR_SQL}`)
    .bind(today, childId, ...dayRecurBinds(today, isWeekday, dayBitOf(today))).first<{ total: number; done: number }>()
  if (!agg || agg.total === 0 || agg.done < agg.total) return null // 전부 완료 아니면 없음

  // 하루 1회 (이미 오늘 받았으면 없음)
  const already = await db.prepare('SELECT id FROM surprises WHERE child_id = ? AND the_date = ?').bind(childId, today).first()
  if (already) return null

  // 점감: 받은 횟수가 늘수록 확률↓ (초반 60% → 하한 15%)
  const cnt = (await db.prepare('SELECT COUNT(*) AS n FROM surprises WHERE child_id = ?').bind(childId).first<{ n: number }>())?.n ?? 0
  const p = Math.max(0.15, 0.6 - 0.03 * cnt)
  if (Math.random() >= p) return null

  const bonus = 5 + Math.floor(Math.random() * 3) * 5 // 5/10/15
  const message = SURPRISE_MSGS[Math.floor(Math.random() * SURPRISE_MSGS.length)]
  try {
    await db.batch([
      db.prepare('INSERT INTO surprises (id, child_id, the_date, points, message, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(randomId('sp'), childId, today, bonus, message, now),
      db.prepare('UPDATE members SET points = points + ? WHERE id = ?').bind(bonus, childId),
      db.prepare('INSERT INTO point_ledger (id, child_id, delta, reason, task_id, note, created_at) VALUES (?, ?, ?, ?, NULL, ?, ?)')
        .bind(randomId('pl'), childId, bonus, 'surprise', '깜짝 선물', now),
    ])
  } catch {
    return null // 동시성 등으로 UNIQUE 충돌 시 조용히 스킵
  }
  return { points: bonus, message }
}

// 일정(할일/목표) 생성
scheduleRoutes.post('/tasks', async (c) => {
  const db = c.env.DB
  const body = await c.req.json<{
    childId?: string; title?: string; category?: string; period?: string
    points?: number; timeLabel?: string; progress?: number; progressLabel?: string
    recur?: string; recurDays?: number[]; date?: string; goalId?: string
    startDate?: string; endDate?: string; autoDaily?: boolean
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
  let recur = ['daily', 'weekdays', 'once', 'days'].includes(body.recur ?? '') ? body.recur! : 'daily'
  let recurDays: number | null = recur === 'days' ? daysToMask(body.recurDays ?? []) : null
  if (recur === 'days' && !recurDays) { recur = 'daily'; recurDays = null } // 요일 미선택 방어
  // 하루 할일만 목표 연결 가능 — 같은 자녀의 주/월 목표인지 확인
  const goalId = period === 'day' ? await validGoalId(db, body.goalId, childId) : null

  const now = Date.now()
  const id = randomId('task')
  const order = await db.prepare('SELECT COALESCE(MAX(sort_order),0)+1 AS n FROM tasks WHERE child_id = ? AND period = ?')
    .bind(childId, period).first<{ n: number }>()
  const progress = Math.max(0, Math.min(100, Math.round(Number(body.progress ?? 0))))

  // 하루 할일의 시작일: 요청 date(주간 보기에서 특정 날짜 추가)가 있으면 그 날짜, 없으면 오늘
  const theDate = body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : familyDate(auth.session.family_id)
  // 목표 기간(시작~종료) / 하루 할일 종료일(언제까지 반복)
  const isoOk = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)
  const gStart = period !== 'day' && isoOk(body.startDate) ? body.startDate! : null
  const tEnd = isoOk(body.endDate) ? body.endDate! : null
  await db.prepare(
    `INSERT INTO tasks (id, family_id, child_id, title, category, period, author_id, points, the_date, time_label, progress, progress_label, recur, recur_days, goal_id, start_date, end_date, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, auth.session.family_id, childId, title, category, period, auth.session.member_id, points,
    period === 'day' ? theDate : null, (body.timeLabel ?? '').trim() || null,
    progress, (body.progressLabel ?? '').trim() || null, recur, recurDays, goalId, gStart, tEnd, order?.n ?? 1, now,
  ).run()

  return c.json({ ok: true, id })
})

// 일정 수정 (자녀는 본인 작성분만)
scheduleRoutes.put('/tasks/:id', async (c) => {
  const db = c.env.DB
  const taskId = c.req.param('id')
  const task = await db.prepare('SELECT id, family_id, child_id, author_id, period, title, category FROM tasks WHERE id = ?')
    .bind(taskId).first<{ id: string; family_id: string; child_id: string; author_id: string; period: string; title: string; category: string }>()
  if (!task) return c.json({ error: 'task_not_found' }, 404)
  const auth = await authChild(db, c.req.header('Cookie') ?? null, task.child_id)
  if (!auth) return c.json({ error: 'unauthorized' }, 401)
  if (auth.session.role === 'child' && task.author_id !== auth.session.member_id) return c.json({ error: 'forbidden' }, 403)

  const body = await c.req.json<{ title?: string; category?: string; points?: number; timeLabel?: string; progress?: number; progressLabel?: string; recur?: string; recurDays?: number[]; goalId?: string; startDate?: string; endDate?: string; autoDaily?: boolean }>()
  const title = (body.title ?? '').trim()
  const category = body.category ?? 'life'
  if (!title || !CATEGORIES.has(category)) return c.json({ error: 'invalid_field' }, 400)
  const points = Math.max(0, Math.min(maxPoints(task.period), Math.round(Number(body.points ?? 10))))
  const progress = Math.max(0, Math.min(100, Math.round(Number(body.progress ?? 0))))
  let recur = ['daily', 'weekdays', 'once', 'days'].includes(body.recur ?? '') ? body.recur! : 'daily'
  let recurDays: number | null = recur === 'days' ? daysToMask(body.recurDays ?? []) : null
  if (recur === 'days' && !recurDays) { recur = 'daily'; recurDays = null }
  const goalId = task.period === 'day' ? await validGoalId(db, body.goalId, task.child_id) : null
  const isoOk = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)
  const gStart = task.period !== 'day' && isoOk(body.startDate) ? body.startDate! : null
  const tEnd = isoOk(body.endDate) ? body.endDate! : null

  await db.prepare(
    'UPDATE tasks SET title = ?, category = ?, points = ?, time_label = ?, progress = ?, progress_label = ?, recur = ?, recur_days = ?, goal_id = ?, start_date = ?, end_date = ? WHERE id = ?',
  ).bind(title, category, points, (body.timeLabel ?? '').trim() || null, progress, (body.progressLabel ?? '').trim() || null, recur, recurDays, goalId, gStart, tEnd, taskId).run()

  // 목표를 수정하면, 이 목표로 '담긴' 하루 할일 중 아직 목표 이름 그대로인 것들의 제목/종류도 같이 반영
  // (직접 다른 이름으로 고친 세부 할일은 건드리지 않는다)
  if (task.period !== 'day' && (title !== task.title || category !== task.category)) {
    await db.prepare("UPDATE tasks SET title = ?, category = ? WHERE goal_id = ? AND period = 'day' AND title = ?")
      .bind(title, category, taskId, task.title).run()
  }

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

// 공부 기록 — 완료된 할일에 '무엇을 했는지' 메모 + 소요 시간(분) 남기기
scheduleRoutes.post('/tasks/:taskId/note', async (c) => {
  const taskId = c.req.param('taskId')
  const db = c.env.DB
  const task = await db.prepare('SELECT id, family_id, child_id FROM tasks WHERE id = ?')
    .bind(taskId).first<{ id: string; family_id: string; child_id: string }>()
  if (!task) return c.json({ error: 'task_not_found' }, 404)
  if (task.family_id !== 'fam_demo') {
    const auth = await authChild(db, c.req.header('Cookie') ?? null, task.child_id)
    if (!auth) return c.json({ error: 'unauthorized' }, 401)
  }

  const today = familyDate(task.family_id)
  const body = await c.req.json<{ date?: string; note?: string; minutes?: number }>().catch(() => ({} as { date?: string; note?: string; minutes?: number }))
  let date = today
  if (body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    if (body.date > today) return c.json({ error: 'future_date' }, 400)
    date = body.date
  }
  const note = (body.note ?? '').trim().slice(0, 80) || null
  const minutes = Math.max(0, Math.min(600, Math.round(Number(body.minutes ?? 0)))) || null
  // 기록 자체가 '했음'을 의미 — 완료 행이 없으면 done=1로 생성, 있으면 메모/시간만 갱신 (토글 직후 빠른 저장에도 안전)
  await db.prepare(`INSERT INTO completions (task_id, the_date, done, approved, note, minutes, completed_at)
     VALUES (?, ?, 1, 0, ?, ?, ?)
     ON CONFLICT(task_id, the_date) DO UPDATE SET note = excluded.note, minutes = excluded.minutes`)
    .bind(taskId, date, note, minutes, Date.now()).run()
  return c.json({ ok: true })
})
