// 계정·데이터 라이프사이클 — 데이터 내보내기(이동성) + 계정·가족 삭제(잊혀질 권리).
// 삭제는 '본인 세션의 가족'만 대상으로 하며 다른 가족은 절대 건드리지 않는다.
import { Hono } from 'hono'
import { type Bindings, readSessionParent } from '../_lib/core'

export const accountRoutes = new Hono<{ Bindings: Bindings }>()

// 내 가족 데이터 전체 내보내기 (부모만). 비밀번호·PIN은 제외.
accountRoutes.get('/account/export', async (c) => {
  const db = c.env.DB
  const session = await readSessionParent(db, c.req.header('Cookie') ?? null)
  if (!session) return c.json({ error: 'unauthorized' }, 401)
  const fid = session.family_id
  const childSub = 'SELECT id FROM members WHERE family_id = ?'

  const all = async <T = Record<string, unknown>>(sql: string, ...binds: unknown[]) =>
    (await db.prepare(sql).bind(...binds).all<T>()).results

  const family = await db.prepare('SELECT id, name, invite_code, created_at FROM families WHERE id = ?').bind(fid).first()
  const members = await all('SELECT id, role, parent_kind, display_name, email, birth_year, points, consent_at, created_at FROM members WHERE family_id = ?', fid)
  const tasks = await all('SELECT * FROM tasks WHERE family_id = ?', fid)
  const completions = await all('SELECT * FROM completions WHERE task_id IN (SELECT id FROM tasks WHERE family_id = ?)', fid)
  const rewardGoals = await all(`SELECT * FROM reward_goals WHERE child_id IN (${childSub})`, fid)
  const encouragements = await all(`SELECT * FROM encouragements WHERE child_id IN (${childSub})`, fid)
  const pointLedger = await all(`SELECT * FROM point_ledger WHERE child_id IN (${childSub})`, fid)
  const events = await all('SELECT * FROM events WHERE family_id = ?', fid).catch(() => [])
  const subjects = await all(`SELECT * FROM subjects WHERE child_id IN (${childSub})`, fid).catch(() => [])
  const studySessions = await all(`SELECT * FROM study_sessions WHERE child_id IN (${childSub})`, fid).catch(() => [])
  const studyGoals = await all(`SELECT * FROM study_goals WHERE child_id IN (${childSub})`, fid).catch(() => [])

  const data = {
    exportedAt: new Date().toISOString(),
    family, members, tasks, completions, rewardGoals, encouragements, pointLedger, events, subjects, studySessions, studyGoals,
  }
  return new Response(JSON.stringify(data, null, 2), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': 'attachment; filename="aimgrim-data.json"' },
  })
})

// 계정·가족 전체 삭제 (부모만, 본인 가족만). 되돌릴 수 없음 → confirm 필수.
accountRoutes.post('/account/delete', async (c) => {
  const db = c.env.DB
  const session = await readSessionParent(db, c.req.header('Cookie') ?? null)
  if (!session) return c.json({ error: 'unauthorized' }, 401)
  const body = await c.req.json<{ confirm?: boolean }>().catch(() => ({} as { confirm?: boolean }))
  if (body.confirm !== true) return c.json({ error: 'confirm_required' }, 400)

  const fid = session.family_id
  const childSub = 'SELECT id FROM members WHERE family_id = ?'
  const memberSub = 'SELECT id FROM members WHERE family_id = ?'
  // 본인 가족(fid) 범위로만 삭제. 다른 가족은 미포함.
  const stmts = [
    db.prepare('DELETE FROM completions WHERE task_id IN (SELECT id FROM tasks WHERE family_id = ?)').bind(fid),
    db.prepare('DELETE FROM tasks WHERE family_id = ?').bind(fid),
    db.prepare(`DELETE FROM reward_goals WHERE child_id IN (${childSub})`).bind(fid),
    db.prepare(`DELETE FROM encouragements WHERE child_id IN (${childSub})`).bind(fid),
    db.prepare(`DELETE FROM point_ledger WHERE child_id IN (${childSub})`).bind(fid),
    db.prepare(`DELETE FROM surprises WHERE child_id IN (${childSub})`).bind(fid),
    db.prepare(`DELETE FROM subjects WHERE child_id IN (${childSub})`).bind(fid),
    db.prepare(`DELETE FROM study_sessions WHERE child_id IN (${childSub})`).bind(fid),
    db.prepare(`DELETE FROM study_goals WHERE child_id IN (${childSub})`).bind(fid),
    db.prepare(`DELETE FROM study_day_awards WHERE child_id IN (${childSub})`).bind(fid),
    db.prepare(`DELETE FROM study_goal_awards WHERE child_id IN (${childSub})`).bind(fid),
    db.prepare('DELETE FROM events WHERE family_id = ?').bind(fid),
    db.prepare(`DELETE FROM password_resets WHERE member_id IN (${memberSub})`).bind(fid),
    db.prepare(`DELETE FROM sessions WHERE member_id IN (${memberSub})`).bind(fid),
    db.prepare('DELETE FROM members WHERE family_id = ?').bind(fid),
    db.prepare('DELETE FROM families WHERE id = ?').bind(fid),
  ]
  await db.batch(stmts)
  c.header('Set-Cookie', 'aimgrim_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0')
  return c.json({ ok: true })
})
