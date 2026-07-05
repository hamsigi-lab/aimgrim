// 보상·격려 도메인 — 자녀가 정한 보상 목표 CRUD/교환, 별점 내역, 부모 격려.
import { Hono } from 'hono'
import { randomId } from '../_lib/crypto'
import { type Bindings, authChild, readSessionParent } from '../_lib/core'

export const rewardRoutes = new Hono<{ Bindings: Bindings }>()

// 보상 목표 생성 (자녀가 갖고 싶은 것)
rewardRoutes.post('/reward-goals', async (c) => {
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

rewardRoutes.delete('/reward-goals/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const rg = await db.prepare('SELECT child_id FROM reward_goals WHERE id = ?').bind(id).first<{ child_id: string }>()
  if (!rg) return c.json({ error: 'not_found' }, 404)
  const auth = await authChild(db, c.req.header('Cookie') ?? null, rg.child_id)
  if (!auth) return c.json({ error: 'unauthorized' }, 401)
  await db.prepare('DELETE FROM reward_goals WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// 보상 교환 (별점을 써서 목표를 이룸)
rewardRoutes.post('/reward-goals/:id/redeem', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const rg = await db.prepare('SELECT id, child_id, title, cost, redeemed_at FROM reward_goals WHERE id = ?')
    .bind(id).first<{ id: string; child_id: string; title: string; cost: number; redeemed_at: number | null }>()
  if (!rg) return c.json({ error: 'not_found' }, 404)
  const auth = await authChild(db, c.req.header('Cookie') ?? null, rg.child_id)
  if (!auth) return c.json({ error: 'unauthorized' }, 401)
  if (rg.redeemed_at) return c.json({ error: 'already_redeemed' }, 400)

  const child = await db.prepare('SELECT points FROM members WHERE id = ?').bind(rg.child_id).first<{ points: number }>()
  if (!child || child.points < rg.cost) return c.json({ error: 'not_enough_points' }, 400)

  const now = Date.now()
  await db.batch([
    db.prepare('UPDATE members SET points = points - ? WHERE id = ?').bind(rg.cost, rg.child_id),
    db.prepare('UPDATE reward_goals SET redeemed_at = ?, saved = ? WHERE id = ?').bind(now, rg.cost, id),
    db.prepare('INSERT INTO point_ledger (id, child_id, delta, reason, task_id, note, created_at) VALUES (?, ?, ?, ?, NULL, ?, ?)')
      .bind(randomId('pl'), rg.child_id, -rg.cost, 'reward_redeem', rg.title, now),
  ])
  const updated = await db.prepare('SELECT points FROM members WHERE id = ?').bind(rg.child_id).first<{ points: number }>()
  return c.json({ ok: true, points: updated?.points ?? 0 })
})

// 별점 내역 (적립·차감 이력)
rewardRoutes.get('/point-ledger', async (c) => {
  const db = c.env.DB
  const childId = c.req.query('childId') ?? 'mem_child'
  if (childId !== 'mem_child') {
    const auth = await authChild(db, c.req.header('Cookie') ?? null, childId)
    if (!auth) return c.json({ error: 'unauthorized' }, 401)
  }
  const rows = await db.prepare('SELECT delta, reason, note, created_at FROM point_ledger WHERE child_id = ? ORDER BY created_at DESC LIMIT 40')
    .bind(childId).all<{ delta: number; reason: string; note: string | null; created_at: number }>()
  return c.json({
    entries: rows.results.map((r) => ({ delta: r.delta, reason: r.reason, note: r.note, createdAt: r.created_at })),
  })
})

// 부모 격려 작성
rewardRoutes.post('/encouragements', async (c) => {
  const db = c.env.DB
  const session = await readSessionParent(db, c.req.header('Cookie') ?? null)
  if (!session) return c.json({ error: 'unauthorized' }, 401)
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
