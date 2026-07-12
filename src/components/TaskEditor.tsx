import { useState } from 'react'
import type { Category, Period, Recur, ScheduleItem } from '../types'
import { createTask, updateTask, deleteTask } from '../api'
import { useApp } from '../state/store'

const RECURS: { id: Recur; label: string }[] = [
  { id: 'daily', label: '매일' },
  { id: 'weekdays', label: '평일' },
  { id: 'days', label: '요일' },
  { id: 'once', label: '한 번' },
]
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const CATS: { id: Category; label: string; emoji: string }[] = [
  { id: 'study', label: '공부', emoji: '📚' },
  { id: 'life', label: '생활', emoji: '🌿' },
  { id: 'health', label: '운동', emoji: '💪' },
  { id: 'play', label: '놀이', emoji: '🎨' },
]

const PERIOD_LABEL: Record<Period, string> = { day: '오늘 할일', week: '이번주 목표', month: '이번달 목표' }

export interface Prefill { title?: string; category?: Category; goalId?: string }

interface Props {
  childId: string
  period: Period
  existing?: ScheduleItem
  /** 하루 할일을 특정 날짜에 추가할 때 (주간 보기) */
  targetDate?: string
  defaultRecur?: Recur
  /** 목표에서 '담기'로 열 때 초기값 */
  prefill?: Prefill
  onClose: () => void
  onSaved: () => void
}

export function TaskEditor({ childId, period, existing, targetDate, defaultRecur, prefill, onClose, onSaved }: Props) {
  const { snapshot } = useApp()
  const editing = !!existing
  const [title, setTitle] = useState(existing?.title ?? prefill?.title ?? '')
  const [category, setCategory] = useState<Category>(existing?.category ?? prefill?.category ?? 'study')
  const [points, setPoints] = useState(existing?.points ?? (period === 'day' ? 10 : 40))
  const [timeLabel, setTimeLabel] = useState(existing?.timeLabel ?? '')
  const [progress, setProgress] = useState(existing?.progress ?? 0)
  const [progressLabel, setProgressLabel] = useState(existing?.progressLabel ?? '')
  const [recur, setRecur] = useState<Recur>(existing?.recur ?? defaultRecur ?? 'daily')
  const [recurDays, setRecurDays] = useState<number[]>(existing?.recurDays ?? [])
  const [goalId, setGoalId] = useState<string | null>(existing?.goalId ?? prefill?.goalId ?? null)
  const [per, setPer] = useState<'week' | 'month'>(period === 'month' ? 'month' : 'week')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const isGoal = period !== 'day'

  // 하루 할일이 연결할 수 있는 목표들 (전체)
  const goalOptions = snapshot?.goals ?? [...(snapshot?.weekGoals ?? []), ...(snapshot?.monthGoal ? [snapshot.monthGoal] : [])]

  async function save() {
    if (!title.trim()) return
    setBusy(true); setErr(null)
    try {
      const rd = recur === 'days' ? recurDays : undefined
      if (editing) {
        await updateTask(existing!.id, { title: title.trim(), category, points, timeLabel, progress, progressLabel, recur, recurDays: rd, goalId: goalId ?? undefined })
      } else {
        await createTask({ childId, title: title.trim(), category, period: isGoal ? per : 'day', points, timeLabel, progress, progressLabel, recur, recurDays: rd, date: targetDate, goalId: goalId ?? undefined })
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
        <h3>{editing ? '일정 고치기' : isGoal ? '목표 추가' : `${PERIOD_LABEL[period]} 추가`}</h3>
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

          {isGoal && !editing && (
            <div className="field">
              <label>목표 기간</label>
              <div className="seg">
                <button type="button" className={per === 'week' ? 'on' : ''} onClick={() => setPer('week')}>이번주</button>
                <button type="button" className={per === 'month' ? 'on' : ''} onClick={() => setPer('month')}>이번달</button>
              </div>
            </div>
          )}

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
                {recur === 'days' && (
                  <div className="wd-picker">
                    {WEEKDAYS.map((w, i) => (
                      <button type="button" key={i} className={`wd-chip${recurDays.includes(i) ? ' on' : ''}${i === 0 ? ' sun' : ''}`}
                        onClick={() => setRecurDays((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])}>{w}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="field">
                <label htmlFor="t-time">언제 (선택)</label>
                <input id="t-time" value={timeLabel} onChange={(e) => setTimeLabel(e.target.value)} placeholder="예: 오후 4시, 자기 전" maxLength={20} />
              </div>
              {goalOptions.length > 0 && (
                <div className="field">
                  <label htmlFor="t-goal">어떤 목표를 위한 일인가요? (선택)</label>
                  <select id="t-goal" className="sel" value={goalId ?? ''} onChange={(e) => setGoalId(e.target.value || null)}>
                    <option value="">목표 연결 안 함</option>
                    {goalOptions.map((g) => <option key={g.id} value={g.id}>🎯 {g.title}</option>)}
                  </select>
                  <span className="hint">연결하면 이 할일을 해낼수록 목표 진행률이 자동으로 올라가요.</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="field">
                <label htmlFor="t-prog">진행률: {progress}%</label>
                <input id="t-prog" type="range" min={0} max={100} step={5} value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))} className="range" />
                <span className="hint">연결된 할일이 있으면 진행률은 완료율로 자동 계산돼요. (연결 없을 때만 수동)</span>
              </div>
              <div className="field">
                <label htmlFor="t-plab">진행 메모 (선택)</label>
                <input id="t-plab" value={progressLabel} onChange={(e) => setProgressLabel(e.target.value)} placeholder="예: 2 / 4 권" maxLength={20} />
              </div>
            </>
          )}

          <button type="button" className="btn primary block" disabled={!title.trim() || busy || (recur === 'days' && recurDays.length === 0)} onClick={save}>
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
