// 가족 캘린더 도메인 (2차 서비스) — 가족 공용 이벤트 CRUD.
// 공용 spine(가족/멤버/세션)을 재사용. 모든 접근은 세션의 family_id 일치를 확인.
import { Hono } from 'hono'
import { randomId } from '../_lib/crypto'
import { type Bindings, authFamily } from '../_lib/core'

export const calendarRoutes = new Hono<{ Bindings: Bindings }>()

const CATS = new Set(['family', 'school', 'birthday', 'trip', 'etc'])

interface EventRow {
  id: string; title: string; the_date: string; time_label: string | null
  category: string; for_member: string | null; note: string | null; author_id: string
}

function mapEvent(r: EventRow, names: Map<string, string>) {
  return {
    id: r.id, title: r.title, date: r.the_date, timeLabel: r.time_label ?? '',
    category: r.category, forMember: r.for_member, forName: r.for_member ? names.get(r.for_member) ?? null : null,
    note: r.note ?? '', authorId: r.author_id,
  }
}

// 가족 이벤트 목록 (선택: ?month=YYYY-MM). 데모는 무인증 열람.
calendarRoutes.get('/family/:familyId/events', async (c) => {
  const db = c.env.DB
  const familyId = c.req.param('familyId')
  if (familyId !== 'fam_demo') {
    const session = await authFamily(db, c.req.header('Cookie') ?? null, familyId)
    if (!session) return c.json({ error: 'unauthorized' }, 401)
  }
  const month = c.req.query('month') // YYYY-MM
  const members = await db.prepare('SELECT id, display_name FROM members WHERE family_id = ?').bind(familyId).all<{ id: string; display_name: string }>()
  const names = new Map(members.results.map((m) => [m.id, m.display_name]))

  const rows = month
    ? await db.prepare('SELECT id, title, the_date, time_label, category, for_member, note, author_id FROM events WHERE family_id = ? AND the_date LIKE ? ORDER BY the_date, time_label')
      .bind(familyId, `${month}-%`).all<EventRow>()
    : await db.prepare('SELECT id, title, the_date, time_label, category, for_member, note, author_id FROM events WHERE family_id = ? ORDER BY the_date, time_label')
      .bind(familyId).all<EventRow>()

  return c.json({ events: rows.results.map((r) => mapEvent(r, names)) })
})

// 이벤트 생성 (가족 구성원 누구나)
calendarRoutes.post('/family/:familyId/events', async (c) => {
  const db = c.env.DB
  const familyId = c.req.param('familyId')
  const session = await authFamily(db, c.req.header('Cookie') ?? null, familyId)
  if (!session) return c.json({ error: 'unauthorized' }, 401)

  const body = await c.req.json<{ title?: string; date?: string; timeLabel?: string; category?: string; forMember?: string; note?: string }>()
  const title = (body.title ?? '').trim()
  const date = (body.date ?? '').trim()
  if (!title) return c.json({ error: 'missing_title' }, 400)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return c.json({ error: 'invalid_date' }, 400)
  const category = CATS.has(body.category ?? '') ? body.category! : 'family'

  // for_member가 지정됐다면 같은 가족 구성원인지 확인
  let forMember: string | null = null
  if (body.forMember) {
    const m = await db.prepare('SELECT id FROM members WHERE id = ? AND family_id = ?').bind(body.forMember, familyId).first()
    if (m) forMember = body.forMember
  }

  const id = randomId('ev')
  await db.prepare('INSERT INTO events (id, family_id, title, the_date, time_label, category, for_member, note, author_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, familyId, title, date, (body.timeLabel ?? '').trim() || null, category, forMember, (body.note ?? '').trim() || null, session.member_id, Date.now()).run()
  return c.json({ ok: true, id })
})

// 이벤트 수정 (작성자 또는 부모)
calendarRoutes.put('/family/:familyId/events/:id', async (c) => {
  const db = c.env.DB
  const familyId = c.req.param('familyId')
  const eventId = c.req.param('id')
  const session = await authFamily(db, c.req.header('Cookie') ?? null, familyId)
  if (!session) return c.json({ error: 'unauthorized' }, 401)
  const ev = await db.prepare('SELECT author_id FROM events WHERE id = ? AND family_id = ?').bind(eventId, familyId).first<{ author_id: string }>()
  if (!ev) return c.json({ error: 'not_found' }, 404)
  if (session.role !== 'parent' && ev.author_id !== session.member_id) return c.json({ error: 'forbidden' }, 403)

  const body = await c.req.json<{ title?: string; date?: string; timeLabel?: string; category?: string; forMember?: string; note?: string }>()
  const title = (body.title ?? '').trim()
  const date = (body.date ?? '').trim()
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return c.json({ error: 'invalid_field' }, 400)
  const category = CATS.has(body.category ?? '') ? body.category! : 'family'
  let forMember: string | null = null
  if (body.forMember) {
    const m = await db.prepare('SELECT id FROM members WHERE id = ? AND family_id = ?').bind(body.forMember, familyId).first()
    if (m) forMember = body.forMember
  }

  await db.prepare('UPDATE events SET title = ?, the_date = ?, time_label = ?, category = ?, for_member = ?, note = ? WHERE id = ?')
    .bind(title, date, (body.timeLabel ?? '').trim() || null, category, forMember, (body.note ?? '').trim() || null, eventId).run()
  return c.json({ ok: true })
})

// 이벤트 삭제 (작성자 또는 부모)
calendarRoutes.delete('/family/:familyId/events/:id', async (c) => {
  const db = c.env.DB
  const familyId = c.req.param('familyId')
  const eventId = c.req.param('id')
  const session = await authFamily(db, c.req.header('Cookie') ?? null, familyId)
  if (!session) return c.json({ error: 'unauthorized' }, 401)
  const ev = await db.prepare('SELECT author_id FROM events WHERE id = ? AND family_id = ?').bind(eventId, familyId).first<{ author_id: string }>()
  if (!ev) return c.json({ error: 'not_found' }, 404)
  if (session.role !== 'parent' && ev.author_id !== session.member_id) return c.json({ error: 'forbidden' }, 403)
  await db.prepare('DELETE FROM events WHERE id = ?').bind(eventId).run()
  return c.json({ ok: true })
})
