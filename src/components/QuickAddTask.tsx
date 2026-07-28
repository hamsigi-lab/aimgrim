import { useState } from 'react'
import { createTask, updateTask } from '../api'
import type { ScheduleItem } from '../types'

// 느슨한 시간 프리셋 (분) — 초등도 쉽게. 직접 시각도 가능.
const TIME_BLOCKS: { label: string; min: number }[] = [
  { label: '아침', min: 480 }, { label: '오전', min: 600 }, { label: '점심', min: 720 },
  { label: '오후', min: 900 }, { label: '저녁', min: 1140 }, { label: '밤', min: 1260 },
]
const pad2 = (n: number) => String(n).padStart(2, '0')
const minToTime = (m: number | null) => (m == null ? '' : `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`)
const timeToMin = (t: string): number | null => { const [h, m] = t.split(':').map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : null }
function fmtLabel(m: number): string { const h = Math.floor(m / 60), mm = m % 60; const ap = h < 12 ? '오전' : '오후'; let hh = h % 12; if (hh === 0) hh = 12; return `${ap} ${hh}${mm ? ':' + pad2(mm) : '시'}` }

/** 간단 할일 추가/고치기 — 시간 + 할일 + 매일 반복만. (자세한 별점·목표 연결은 생략, 기본값) */
export function QuickAddTask({ childId, targetDate, existing, onClose, onSaved }: {
  childId: string
  targetDate?: string
  existing?: ScheduleItem
  onClose: () => void
  onSaved: () => void
}) {
  const editing = !!existing
  const [title, setTitle] = useState(existing?.title ?? '')
  const [startMin, setStartMin] = useState<number | null>(existing?.startMin ?? null)
  const [repeat, setRepeat] = useState(existing ? existing.recur !== 'once' : false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    if (!title.trim()) return
    setBusy(true); setErr(null)
    const tl = startMin != null ? fmtLabel(startMin) : ''
    const common = {
      title: title.trim(), category: existing?.category ?? 'life',
      points: existing?.points ?? 10, recur: (repeat ? 'daily' : 'once') as 'daily' | 'once',
      timeLabel: tl, startMin: startMin ?? undefined, endMin: undefined,
      goalId: existing?.goalId ?? undefined,
    }
    try {
      if (editing) await updateTask(existing!.id, common)
      else await createTask({ childId, period: 'day', date: targetDate, ...common })
      onSaved(); onClose()
    } catch { setErr('저장에 실패했어요.'); setBusy(false) }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="할일 추가">
        <div className="grip" />
        <button type="button" className="sheet-close" aria-label="닫기" onClick={onClose}>✕</button>
        <h3>{editing ? '할일 고치기' : '할일 추가'}</h3>
        <div className="form" style={{ marginTop: 12 }}>
          {err && <div className="formerr">{err}</div>}

          <div className="field">
            <label htmlFor="qa-title">무엇을 할까요?</label>
            <input id="qa-title" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 수학 문제집 4쪽" maxLength={40} autoFocus />
          </div>

          <div className="field">
            <label>언제 할까요? (시간)</label>
            <div className="tb-chips">
              <button type="button" className={`tb-chip${startMin == null ? ' on' : ''}`} onClick={() => setStartMin(null)}>시간 없음</button>
              {TIME_BLOCKS.map((b) => (
                <button type="button" key={b.min} className={`tb-chip${startMin === b.min ? ' on' : ''}`} onClick={() => setStartMin(b.min)}>{b.label}</button>
              ))}
            </div>
            <div className="daterange" style={{ marginTop: 8 }}>
              <input type="time" aria-label="시간 직접 정하기" value={minToTime(startMin)} onChange={(e) => setStartMin(timeToMin(e.target.value))} />
            </div>
          </div>

          <label className="qa-repeat">
            <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
            <span>매일 반복 <em>— 켜면 매일 이 시간에 나와요</em></span>
          </label>

          <button type="button" className="btn primary block" disabled={!title.trim() || busy} onClick={save}>
            {busy ? '저장 중…' : '확인'}
          </button>
        </div>
      </div>
    </div>
  )
}
