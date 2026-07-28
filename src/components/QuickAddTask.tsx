import { useState } from 'react'
import { createTask, updateTask, deleteTask } from '../api'
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

/**
 * 간단 일정 시트.
 * - 추가: 시간(한 번) + 항목 여러 개 + 매일 반복 → 확인. 한 시간대에 여러 할일을 한꺼번에.
 * - 고치기: 항목 하나 + 시간 + 반복 + 삭제.
 * 별점은 부모만 설정(canSetPoints). 아이는 완료 시 자동 10점(기본).
 */
export function QuickAddTask({ childId, targetDate, existing, canSetPoints, onClose, onSaved }: {
  childId: string
  targetDate?: string
  existing?: ScheduleItem
  canSetPoints?: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const editing = !!existing
  const [draft, setDraft] = useState(existing?.title ?? '')
  const [items, setItems] = useState<string[]>([]) // 추가 모드: 여러 항목
  const [startMin, setStartMin] = useState<number | null>(existing?.startMin ?? null)
  const [endMin, setEndMin] = useState<number | null>(existing?.endMin ?? null)
  const [repeat, setRepeat] = useState(existing ? existing.recur !== 'once' : true)
  const [points, setPoints] = useState(existing?.points ?? 10)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function addItem() { const v = draft.trim(); if (!v) return; setItems((a) => [...a, v]); setDraft('') }
  const pending = [...items, ...(draft.trim() ? [draft.trim()] : [])]

  async function save() {
    const list = editing ? (draft.trim() ? [draft.trim()] : []) : pending
    if (list.length === 0) return
    setBusy(true); setErr(null)
    const tl = startMin != null ? fmtLabel(startMin) : ''
    const eMin = (endMin != null && startMin != null && endMin > startMin) ? endMin : undefined
    const common = {
      category: existing?.category ?? 'life', points,
      recur: (repeat ? 'daily' : 'once') as 'daily' | 'once',
      timeLabel: tl, startMin: startMin ?? undefined, endMin: eMin,
    }
    try {
      if (editing) await updateTask(existing!.id, { title: list[0], goalId: existing!.goalId ?? undefined, ...common })
      else for (const title of list) await createTask({ childId, period: 'day', date: targetDate, title, ...common })
      onSaved(); onClose()
    } catch { setErr('저장에 실패했어요.'); setBusy(false) }
  }

  async function remove() {
    if (!existing) return
    setBusy(true); setErr(null)
    try { await deleteTask(existing.id); onSaved(); onClose() }
    catch { setErr('삭제에 실패했어요.'); setBusy(false) }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="일정">
        <div className="grip" />
        <button type="button" className="sheet-close" aria-label="닫기" onClick={onClose}>✕</button>
        <h3>{editing ? '할일 고치기' : '할일 추가'}</h3>
        <div className="form" style={{ marginTop: 12 }}>
          {err && <div className="formerr">{err}</div>}

          {/* 1) 시간 — 먼저 한 번만 */}
          <div className="field">
            <label>언제 할까요? (시간)</label>
            <div className="tb-chips">
              <button type="button" className={`tb-chip${startMin == null ? ' on' : ''}`} onClick={() => { setStartMin(null); setEndMin(null) }}>시간 없음</button>
              {TIME_BLOCKS.map((b) => (
                <button type="button" key={b.min} className={`tb-chip${startMin === b.min ? ' on' : ''}`} onClick={() => { setStartMin(b.min); setEndMin(null) }}>{b.label}</button>
              ))}
            </div>
            <div className="daterange" style={{ marginTop: 8 }}>
              <input type="time" aria-label="시작 시각" value={minToTime(startMin)} onChange={(e) => setStartMin(timeToMin(e.target.value))} />
              <span>~</span>
              <input type="time" aria-label="끝 시각(선택)" value={minToTime(endMin)} onChange={(e) => setEndMin(timeToMin(e.target.value))} />
            </div>
          </div>

          {/* 2) 할일 — 고치기는 하나, 추가는 여러 개 */}
          <div className="field">
            <label htmlFor="qa-title">{editing ? '무엇을 할까요?' : '해야 할 일 (여러 개 넣을 수 있어요)'}</label>
            <div className="qa-additem">
              <input id="qa-title" value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (!editing && e.key === 'Enter') { e.preventDefault(); addItem() } }}
                placeholder={editing ? '예: 수학 문제집 4쪽' : '예: 운동 (엔터 또는 ＋로 추가)'} maxLength={40} autoFocus />
              {!editing && <button type="button" className="qa-add-btn" onClick={addItem} aria-label="항목 추가">＋</button>}
            </div>
            {!editing && items.length > 0 && (
              <div className="qa-items">
                {items.map((it, i) => (
                  <div key={i} className="qa-item">
                    <span>{it}</span>
                    <button type="button" aria-label="빼기" onClick={() => setItems((a) => a.filter((_, j) => j !== i))}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3) 반복 */}
          <label className="qa-repeat">
            <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
            <span>매일 반복 <em>— 켜면 매일 이 시간에 나와요</em></span>
          </label>

          {/* 4) 별점 — 부모만. 아이는 완료 시 자동 10점 */}
          {canSetPoints ? (
            <div className="field">
              <label>별점 (해내면 받을 점수)</label>
              <div className="stepper">
                <button type="button" onClick={() => setPoints((p) => Math.max(0, p - 5))} aria-label="줄이기">−</button>
                <span className="pv">{points} ⭐</span>
                <button type="button" onClick={() => setPoints((p) => Math.min(1000, p + 5))} aria-label="늘리기">+</button>
              </div>
              <div className="diff-chips">
                {([['쉬움', 5], ['보통', 10], ['어려움', 20]] as [string, number][]).map(([lab, val]) => (
                  <button type="button" key={lab} className={`diff-chip${points === val ? ' on' : ''}`} onClick={() => setPoints(val)}>{lab} {val}</button>
                ))}
              </div>
            </div>
          ) : (
            <p className="hint" style={{ margin: '2px 2px 4px' }}>완료하면 자동으로 <b>{points}⭐</b>이 쌓여요. (별점은 부모님이 정해요)</p>
          )}

          <button type="button" className="btn primary block" disabled={(editing ? !draft.trim() : pending.length === 0) || busy} onClick={save}>
            {busy ? '저장 중…' : editing ? '고치기' : (pending.length > 1 ? `${pending.length}개 추가하기` : '확인')}
          </button>
          {editing && (
            <button type="button" className="linkbtn" style={{ color: 'var(--crit)' }} onClick={remove} disabled={busy}>삭제하기</button>
          )}
        </div>
      </div>
    </div>
  )
}
