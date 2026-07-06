import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../state/store'
import { useAuth } from '../auth/AuthProvider'
import { getEvents, type FamilyEvent } from '../api'
import { EventEditor, type MemberOption } from '../components/EventEditor'

const WD = ['일', '월', '화', '수', '목', '금', '토']
const CAT_EMOJI: Record<string, string> = { family: '🏡', school: '🎒', birthday: '🎂', trip: '🚗', etc: '📌' }

function pad(n: number) { return String(n).padStart(2, '0') }

interface Cell { day: number | null; date: string; isToday: boolean }
function buildCells(year: number, month0: number, todayISO: string): Cell[] {
  const first = new Date(Date.UTC(year, month0, 1))
  const startOffset = first.getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate()
  const cells: Cell[] = []
  for (let i = 0; i < startOffset; i++) cells.push({ day: null, date: '', isToday: false })
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${pad(month0 + 1)}-${pad(d)}`
    cells.push({ day: d, date: ds, isToday: ds === todayISO })
  }
  return cells
}

export function CalendarPanel() {
  const { snapshot } = useApp()
  const { status, familyId, me } = useAuth()
  const todayISO = snapshot?.today ?? new Date().toISOString().slice(0, 10)
  const canManage = status !== 'demo'

  const [offset, setOffset] = useState(0) // 월 이동
  const [events, setEvents] = useState<FamilyEvent[]>([])
  const [selected, setSelected] = useState(todayISO)
  const [editor, setEditor] = useState<{ existing?: FamilyEvent } | null>(null)

  const base = new Date(todayISO + 'T00:00:00Z')
  const viewYear = base.getUTCFullYear()
  const viewMonth0 = base.getUTCMonth() + offset
  const view = new Date(Date.UTC(viewYear, viewMonth0, 1))
  const y = view.getUTCFullYear(); const m0 = view.getUTCMonth()
  const monthStr = `${y}-${pad(m0 + 1)}`

  const load = () => { if (familyId) getEvents(familyId, monthStr).then((r) => setEvents(r.events)).catch(() => setEvents([])) }
  useEffect(load, [familyId, monthStr])

  const byDate = useMemo(() => {
    const map = new Map<string, FamilyEvent[]>()
    for (const e of events) { const a = map.get(e.date) ?? []; a.push(e); map.set(e.date, a) }
    return map
  }, [events])

  const cells = buildCells(y, m0, todayISO)
  const selectedEvents = byDate.get(selected) ?? []

  const memberOptions: MemberOption[] = useMemo(() => {
    const opts: MemberOption[] = [{ id: null, name: '온가족' }]
    me?.children?.forEach((c) => opts.push({ id: c.id, name: c.name }))
    if (me?.member && me.member.role === 'parent') opts.push({ id: me.member.id, name: `${me.member.name}(나)` })
    return opts
  }, [me])

  function selDate(d: string) { if (d) setSelected(d) }

  return (
    <div className="panel">
      <div className="cal-head">
        <button type="button" className="cal-nav" aria-label="이전 달" onClick={() => setOffset((o) => o - 1)}>‹</button>
        <div className="cal-title">{y}년 {m0 + 1}월</div>
        <button type="button" className="cal-nav" aria-label="다음 달" onClick={() => setOffset((o) => o + 1)}>›</button>
      </div>

      <div className="cal-grid">
        {WD.map((w, i) => <div key={w} className={`cal-wd${i === 0 ? ' sun' : ''}`}>{w}</div>)}
        {cells.map((c, i) => {
          const evs = c.date ? byDate.get(c.date) : undefined
          return (
            <button type="button" key={i} disabled={!c.day}
              className={`cal-cell${c.isToday ? ' today' : ''}${c.date === selected ? ' sel' : ''}${!c.day ? ' empty' : ''}`}
              onClick={() => selDate(c.date)}>
              <span className="cal-d">{c.day ?? ''}</span>
              {evs && evs.length > 0 && (
                <span className="cal-dots">{evs.slice(0, 3).map((e) => <i key={e.id} className={`dot ev-${e.category}`} />)}</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="sechead" style={{ marginTop: 18 }}>
        <h3>{Number(selected.slice(5, 7))}월 {Number(selected.slice(8, 10))}일 일정</h3>
        <span className="count">{selectedEvents.length}개</span>
      </div>

      {selectedEvents.length === 0 && <p className="empty-hint">이 날의 일정이 없어요.</p>}
      {selectedEvents.map((e) => (
        <button type="button" key={e.id} className="ev-row"
          onClick={canManage ? () => setEditor({ existing: e }) : undefined}
          style={canManage ? undefined : { cursor: 'default' }}>
          <span className={`ev-ico ev-${e.category}`} aria-hidden="true">{CAT_EMOJI[e.category] ?? '📌'}</span>
          <span className="ev-mid">
            <span className="ev-title">{e.title}</span>
            <span className="ev-meta">
              {e.timeLabel && <span>{e.timeLabel}</span>}
              {e.forName && <span className="ev-for">{e.forName}</span>}
              {e.note && <span className="ev-note">· {e.note}</span>}
            </span>
          </span>
          {canManage && <span className="ev-edit" aria-hidden="true">✎</span>}
        </button>
      ))}

      {canManage && (
        <div className="add-row">
          <button type="button" className="add-btn" onClick={() => setEditor({})}>＋ 일정 추가</button>
        </div>
      )}

      {editor && canManage && familyId && (
        <EventEditor familyId={familyId} members={memberOptions} defaultDate={selected}
          existing={editor.existing} onClose={() => setEditor(null)} onSaved={load} />
      )}
    </div>
  )
}
