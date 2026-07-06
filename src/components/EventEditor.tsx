import { useState } from 'react'
import { createEvent, updateEvent, deleteEvent, type FamilyEvent, type EventCategory } from '../api'

const CATS: { id: EventCategory; label: string; emoji: string }[] = [
  { id: 'family', label: '가족', emoji: '🏡' },
  { id: 'school', label: '학교', emoji: '🎒' },
  { id: 'birthday', label: '생일', emoji: '🎂' },
  { id: 'trip', label: '나들이', emoji: '🚗' },
  { id: 'etc', label: '기타', emoji: '📌' },
]

export interface MemberOption { id: string | null; name: string }

interface Props {
  familyId: string
  members: MemberOption[]
  defaultDate: string
  existing?: FamilyEvent
  onClose: () => void
  onSaved: () => void
}

export function EventEditor({ familyId, members, defaultDate, existing, onClose, onSaved }: Props) {
  const editing = !!existing
  const [title, setTitle] = useState(existing?.title ?? '')
  const [date, setDate] = useState(existing?.date ?? defaultDate)
  const [timeLabel, setTimeLabel] = useState(existing?.timeLabel ?? '')
  const [category, setCategory] = useState<EventCategory>(existing?.category ?? 'family')
  const [forMember, setForMember] = useState<string | null>(existing?.forMember ?? null)
  const [note, setNote] = useState(existing?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    if (!title.trim() || !date) return
    setBusy(true); setErr(null)
    const input = { title: title.trim(), date, timeLabel, category, forMember: forMember ?? undefined, note }
    try {
      if (editing) await updateEvent(familyId, existing!.id, input)
      else await createEvent(familyId, input)
      onSaved(); onClose()
    } catch { setErr('저장에 실패했어요.'); setBusy(false) }
  }
  async function remove() {
    if (!existing) return
    setBusy(true)
    try { await deleteEvent(familyId, existing.id); onSaved(); onClose() }
    catch { setErr('삭제에 실패했어요.'); setBusy(false) }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="일정 편집">
        <div className="grip" />
        <h3>{editing ? '일정 고치기' : '가족 일정 추가'}</h3>
        <div className="form" style={{ marginTop: 12 }}>
          {err && <div className="formerr">{err}</div>}
          <div className="field">
            <label htmlFor="e-title">무슨 일정인가요?</label>
            <input id="e-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 가족 나들이" maxLength={40} autoFocus />
          </div>
          <div className="field">
            <label htmlFor="e-date">날짜</label>
            <input id="e-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="e-time">시간 (선택)</label>
            <input id="e-time" value={timeLabel} onChange={(e) => setTimeLabel(e.target.value)} placeholder="예: 오후 3시" maxLength={20} />
          </div>
          <div className="field">
            <label>종류</label>
            <div className="cat-chips" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
              {CATS.map((cc) => (
                <button type="button" key={cc.id} className={`cat-chip ev-${cc.id}${category === cc.id ? ' on' : ''}`} onClick={() => setCategory(cc.id)}>
                  <span aria-hidden="true">{cc.emoji}</span> {cc.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="e-for">누구 일정</label>
            <select id="e-for" className="sel" value={forMember ?? ''} onChange={(e) => setForMember(e.target.value || null)}>
              {members.map((m) => <option key={m.id ?? 'all'} value={m.id ?? ''}>{m.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="e-note">메모 (선택)</label>
            <input id="e-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 케이크 준비!" maxLength={60} />
          </div>
          <button type="button" className="btn primary block" disabled={!title.trim() || !date || busy} onClick={save}>
            {busy ? '저장 중…' : editing ? '고치기' : '추가하기'}
          </button>
          {editing && <button type="button" className="linkbtn" style={{ color: 'var(--crit)' }} onClick={remove} disabled={busy}>삭제하기</button>}
        </div>
      </div>
    </div>
  )
}
