// aimgrim API — Cloudflare Pages Functions (Hono)
// 배포 시 /api/* 로 서빙된다. env.DB = D1 바인딩.
import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'

type Bindings = { DB: D1Database }
type Author = 'me' | 'mom' | 'dad'

const app = new Hono<{ Bindings: Bindings }>().basePath('/api')

// --- 헬퍼: 작성자 표시(me/mom/dad) ---
function authorLabel(authorId: string, childId: string, parentKind: string | null): Author {
  if (authorId === childId) return 'me'
  return parentKind === 'dad' ? 'dad' : 'mom'
}

interface TaskRow {
  id: string; title: string; category: string; author_id: string; child_id: string
  parent_kind: string | null; points: number; time_label: string | null
  progress: number; progress_label: string | null; done: number | null; approved: number | null
}

// GET /api/family/:familyId/snapshot?childId=...
// 자녀 한 명의 오늘/주/월/보상/격려/포인트 스냅샷
app.get('/family/:familyId/snapshot', async (c) => {
  const familyId = c.req.param('familyId')
  const childId = c.req.query('childId') ?? 'mem_child'
  const db = c.env.DB

  const child = await db
    .prepare('SELECT display_name, points FROM members WHERE id = ? AND family_id = ? AND role = \'child\'')
    .bind(childId, familyId)
    .first<{ display_name: string; points: number }>()

  if (!child) return c.json({ error: 'child_not_found' }, 404)

  const taskSql = `
    SELECT t.id, t.title, t.category, t.author_id, t.child_id, am.parent_kind,
           t.points, t.time_label, t.progress, t.progress_label,
           c.done, c.approved
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

// POST /api/tasks/:taskId/toggle  { childId }
// 자녀 완료 신고 토글 + 별점 반영
app.post('/tasks/:taskId/toggle', async (c) => {
  const taskId = c.req.param('taskId')
  const db = c.env.DB

  const task = await db
    .prepare('SELECT id, child_id, points FROM tasks WHERE id = ?')
    .bind(taskId).first<{ id: string; child_id: string; points: number }>()
  if (!task) return c.json({ error: 'task_not_found' }, 404)

  const comp = await db
    .prepare('SELECT done, approved FROM completions WHERE task_id = ?')
    .bind(taskId).first<{ done: number; approved: number }>()

  const wasDone = !!comp?.done
  const nextDone = !wasDone
  const delta = nextDone ? task.points : -task.points
  const now = Date.now()

  await db.batch([
    db.prepare(
      `INSERT INTO completions (task_id, done, approved, completed_at)
       VALUES (?, ?, 0, ?)
       ON CONFLICT(task_id) DO UPDATE SET done = excluded.done,
         completed_at = CASE WHEN excluded.done = 1 THEN excluded.completed_at ELSE NULL END`,
    ).bind(taskId, nextDone ? 1 : 0, nextDone ? now : null),
    db.prepare('UPDATE members SET points = MAX(0, points + ?) WHERE id = ?').bind(delta, task.child_id),
    db.prepare(
      'INSERT INTO point_ledger (id, child_id, delta, reason, task_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(`pl_${now}_${taskId}`, task.child_id, delta, nextDone ? 'task_done' : 'task_undone', taskId, now),
  ])

  const updated = await db
    .prepare('SELECT points FROM members WHERE id = ?')
    .bind(task.child_id).first<{ points: number }>()

  return c.json({ done: nextDone, points: updated?.points ?? 0, gained: nextDone ? task.points : 0 })
})

export const onRequest = handle(app)
