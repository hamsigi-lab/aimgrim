import { useState } from 'react'
import type { Category, Period, Recur, ScheduleItem } from '../types'
import { createTask, updateTask, deleteTask } from '../api'
import { useApp } from '../state/store'
import { mondayISO, shiftISO } from '../lib/calendar'

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

function monthRange(iso: string): [string, string] {
  const s = iso.slice(0, 8) + '01'
  const d = new Date(iso + 'T00:00:00Z')
  const e = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10)
  return [s, e]
}
function weekRange(iso: string): [string, string] { const m = mondayISO(iso); return [m, shiftISO(m, 6)] }

export interface Prefill { title?: string; category?: Category; goalId?: string; endDate?: string }

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
  const isGoal = period !== 'day'
  const today = snapshot?.today ?? new Date().toISOString().slice(0, 10)

  const [title, setTitle] = useState(existing?.title ?? prefill?.title ?? '')
  const [category, setCategory] = useState<Category>(existing?.category ?? prefill?.category ?? 'study')
  const [points, setPoints] = useState(existing?.points ?? (period === 'day' ? 10 : 40))
  const [timeLabel, setTimeLabel] = useState(existing?.timeLabel ?? '')
  const [progress, setProgress] = useState(existing?.progress ?? 0)
  const [progressLabel, setProgressLabel] = useState(existing?.progressLabel ?? '')
  const [recur, setRecur] = useState<Recur>(existing?.recur ?? defaultRecur ?? 'daily')
  const [recurDays, setRecurDays] = useState<number[]>(existing?.recurDays ?? [])
  const [goalId, setGoalId] = useState<string | null>(existing?.goalId ?? prefill?.goalId ?? null)

  // 목표 실천 기간 (시작~종료). 기본: period가 week면 이번주, 아니면 이번달
  const initRange: [string, string] = existing?.startDate && existing?.endDate
    ? [existing.startDate, existing.endDate]
    : (period === 'week' ? weekRange(today) : monthRange(today))
  const [gStart, setGStart] = useState(initRange[0])
  const [gEnd, setGEnd] = useState(initRange[1])
  const [per, setPer] = useState<'week' | 'month'>(period === 'week' ? 'week' : 'month')
  // 하루 할일 반복 종료일 (언제까지)
  const [tEnd, setTEnd] = useState(existing?.endDate ?? prefill?.endDate ?? '')
  // 목표를 오늘 할일에 매일 체크 항목으로 자동 추가
  const [autoDaily, setAutoDaily] = useState(true)

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function preset(kind: 'week' | 'month') {
    const [s, e] = kind === 'week' ? weekRange(today) : monthRange(today)
    setGStart(s); setGEnd(e); setPer(kind)
  }

  const goalOptions = snapshot?.goals ?? [...(snapshot?.weekGoals ?? []), ...(snapshot?.monthGoal ? [snapshot.monthGoal] : [])]

  async function save() {
    if (!title.trim()) return
    if (isGoal && gStart && gEnd && gEnd < gStart) { setErr('종료일이 시작일보다 빨라요.'); return }
    setBusy(true); setErr(null)
    try {
      const rd = recur === 'days' ? recurDays : undefined
      const goalDates = isGoal ? { startDate: gStart || undefined, endDate: gEnd || undefined, autoDaily } : { endDate: tEnd || undefined }
      if (editing) {
        await updateTask(existing!.id, { title: title.trim(), category, points, timeLabel, progress, progressLabel, recur, recurDays: rd, goalId: goalId ?? undefined, ...goalDates })
      } else {
        await createTask({ childId, title: title.trim(), category, period: isGoal ? per : 'day', points, timeLabel, progress, progressLabel, recur, recurDays: rd, date: targetDate, goalId: goalId ?? undefined, ...goalDates })
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
        <h3>{editing ? '일정 고치기' : isGoal ? '목표 세우기' : `${PERIOD_LABEL[period]} 추가`}</h3>
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

          {isGoal && (
            <div className="field">
              <label>실천 기간 · 언제까지</label>
              <div className="seg">
                <button type="button" className={per === 'week' ? 'on' : ''} onClick={() => preset('week')}>이번주</button>
                <button type="button" className={per === 'month' ? 'on' : ''} onClick={() => preset('month')}>이번달</button>
              </div>
              <div className="daterange">
                <input type="date" value={gStart} onChange={(e) => { setGStart(e.target.value); setPer('month') }} />
                <span>~</span>
                <input type="date" value={gEnd} onChange={(e) => { setGEnd(e.target.value); setPer('month') }} />
              </div>
              <span className="hint">이 기간 동안 계획에서 실천을 확인해요. 방학처럼 직접 정할 수 있어요.</span>
              <label className="checkrow">
                <input type="checkbox" checked={autoDaily} onChange={(e) => setAutoDaily(e.target.checked)} />
                <span>오늘 할일에 매일 체크 항목으로 넣기</span>
              </label>
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
              {recur !== 'once' && (
                <div className="field">
                  <label htmlFor="t-end">언제까지 반복 (선택)</label>
                  <input id="t-end" type="date" value={tEnd} onChange={(e) => setTEnd(e.target.value)} />
                  <span className="hint">비워두면 계속 반복돼요. 목표 기간에 맞추면 그날까지만 나와요.</span>
                </div>
              )}
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
                <span className="hint">연결된 실천이 있으면 진행률은 완료율로 자동 계산돼요. (연결 없을 때만 수동)</span>
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
