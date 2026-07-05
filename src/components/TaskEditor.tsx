import { useState } from 'react'
import type { Category, Period, Recur, ScheduleItem } from '../types'
import { createTask, updateTask, deleteTask } from '../api'

const RECURS: { id: Recur; label: string }[] = [
  { id: 'daily', label: '매일' },
  { id: 'weekdays', label: '평일만' },
  { id: 'once', label: '오늘만' },
]

const CATS: { id: Category; label: string; emoji: string }[] = [
  { id: 'study', label: '공부', emoji: '📚' },
  { id: 'life', label: '생활', emoji: '🌿' },
  { id: 'health', label: '운동', emoji: '💪' },
  { id: 'play', label: '놀이', emoji: '🎨' },
]

const PERIOD_LABEL: Record<Period, string> = { day: '오늘 할일', week: '이번주 목표', month: '이번달 목표' }

interface Props {
  childId: string
  period: Period
  existing?: ScheduleItem
  onClose: () => void
  onSaved: () => void
}

export function TaskEditor({ childId, period, existing, onClose, onSaved }: Props) {
  const editing = !!existing
  const [title, setTitle] = useState(existing?.title ?? '')
  const [category, setCategory] = useState<Category>(existing?.category ?? 'study')
  const [points, setPoints] = useState(existing?.points ?? (period === 'day' ? 10 : 40))
  const [timeLabel, setTimeLabel] = useState(existing?.timeLabel ?? '')
  const [progress, setProgress] = useState(existing?.progress ?? 0)
  const [progressLabel, setProgressLabel] = useState(existing?.progressLabel ?? '')
  const [recur, setRecur] = useState<Recur>(existing?.recur ?? 'daily')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const isGoal = period !== 'day'

  async function save() {
    if (!title.trim()) return
    setBusy(true); setErr(null)
    try {
      if (editing) {
        await updateTask(existing!.id, { title: title.trim(), category, points, timeLabel, progress, progressLabel, recur })
      } else {
        await createTask({ childId, title: title.trim(), category, period, points, timeLabel, progress, progressLabel, recur })
      }
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
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="일정 편집">
        <div className="grip" />
        <h3>{editing ? '일정 고치기' : `${PERIOD_LABEL[period]} 추가`}</h3>
        <div className="form" style={{ marginTop: 12 }}>
          {err && <div className="formerr">{err}</div>}
          <div className="field">
            <label htmlFor="t-title">무엇을 할까요?</label>
            <input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={isGoal ? '예: 책 4권 읽기' : '예: 수학 문제집 4쪽'} maxLength={40} autoFocus />
          </div>

          <div className="field">
            <label>종류</label>
            <div className="cat-chips">
              {CATS.map((cc) => (
                <button type="button" key={cc.id} className={`cat-chip ${cc.id}${category === cc.id ? ' on' : ''}`} onClick={() => setCategory(cc.id)}>
                  <span aria-hidden="true">{cc.emoji}</span> {cc.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="t-pts">별점 (해내면 받을 점수)</label>
            <div className="stepper">
              <button type="button" onClick={() => setPoints((p) => Math.max(0, p - 5))} aria-label="줄이기">−</button>
              <span className="pv">{points} ⭐</span>
              <button type="button" onClick={() => setPoints((p) => Math.min(1000, p + 5))} aria-label="늘리기">+</button>
            </div>
          </div>

          {!isGoal ? (
            <>
              <div className="field">
                <label>반복</label>
                <div className="seg">
                  {RECURS.map((r) => (
                    <button type="button" key={r.id} className={recur === r.id ? 'on' : ''} onClick={() => setRecur(r.id)}>{r.label}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label htmlFor="t-time">언제 (선택)</label>
                <input id="t-time" value={timeLabel} onChange={(e) => setTimeLabel(e.target.value)} placeholder="예: 오후 4시, 자기 전" maxLength={20} />
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <label htmlFor="t-prog">진행률: {progress}%</label>
                <input id="t-prog" type="range" min={0} max={100} step={5} value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))} className="range" />
              </div>
              <div className="field">
                <label htmlFor="t-plab">진행 메모 (선택)</label>
                <input id="t-plab" value={progressLabel} onChange={(e) => setProgressLabel(e.target.value)} placeholder="예: 2 / 4 권" maxLength={20} />
              </div>
            </>
          )}

          <button type="button" className="btn primary block" disabled={!title.trim() || busy} onClick={save}>
            {busy ? '저장 중…' : editing ? '고치기' : '추가하기'}
          </button>
          {editing && (
            <button type="button" className="linkbtn" style={{ color: 'var(--crit)' }} onClick={remove} disabled={busy}>삭제하기</button>
          )}
        </div>
      </div>
    </div>
  )
}
