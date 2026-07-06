import { useEffect, useState } from 'react'
import { useApp } from '../state/store'
import { useAuth } from '../auth/AuthProvider'
import { TaskEditor, type Prefill } from '../components/TaskEditor'
import { TaskRow } from '../components/TaskRow'
import { fetchWeek, toggleTask as apiToggle, DEMO_FAMILY, type WeekDayPlan } from '../api'
import { mondayISO, shiftISO, shortDay } from '../lib/calendar'
import type { ScheduleItem } from '../types'

const AUTHOR_LABEL: Record<ScheduleItem['author'], string> = { me: '내가', mom: '엄마가', dad: '아빠가' }

/** 주간/월간 목표 행 — 진행률(자동/수동) + 편집 + 하루계획 담기 */
function GoalRow({ goal, onEdit, onCascade }: { goal: ScheduleItem; onEdit?: (g: ScheduleItem) => void; onCascade?: (g: ScheduleItem) => void }) {
  const done = goal.progress >= 100
  const label = goal.autoProgress ? `${goal.progress}% · 자동` : (goal.progressLabel || `${goal.progress}%`)
  return (
    <div className="goal-item">
      <div className={`task readonly${done ? ' done' : ''}`} style={{ marginBottom: 0 }}>
        <span className={`cat ${goal.category}`} aria-hidden="true" />
        <span className="check">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10.5l4 4 8-9" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <span className="tmid">
          <span className="t">{goal.title}</span>
          <span className="tmeta">
            <span className={`who ${goal.author}`}>{AUTHOR_LABEL[goal.author]}</span>
            <span className="time">{label}</span>
          </span>
          <span className="goal-bar"><i style={{ width: `${goal.progress}%` }} /></span>
        </span>
        {onEdit && <button type="button" className="edit-handle" aria-label="고치기" onClick={() => onEdit(goal)}>✎</button>}
      </div>
      {onCascade && (
        <button type="button" className="goal-cascade" onClick={() => onCascade(goal)}>＋ 이 목표를 하루계획에 담기</button>
      )}
    </div>
  )
}

export function WeekPanel({ onOpenDay }: { onOpenDay?: () => void }) {
  const { snapshot, childId, reload } = useApp()
  const { status, familyId } = useAuth()
  const [offset, setOffset] = useState(0)
  const [goalEditor, setGoalEditor] = useState<{ existing?: ScheduleItem } | null>(null)
  const [dayEditor, setDayEditor] = useState<{ date: string; prefill?: Prefill } | null>(null)
  const [week, setWeek] = useState<{ today: string; days: WeekDayPlan[] } | null>(null)

  const fam = status === 'demo' ? DEMO_FAMILY : familyId ?? DEMO_FAMILY
  const anchor = snapshot?.today ?? ''
  const monday = anchor ? shiftISO(mondayISO(anchor), offset * 7) : ''

  function load() {
    if (!monday) return
    fetchWeek(monday, fam, childId).then(setWeek).catch(() => setWeek(null))
  }
  useEffect(load, [monday, fam, childId])

  if (!snapshot) return null
  const canManage = status !== 'demo'
  const today = week?.today ?? anchor
  const sunday = shiftISO(monday, 6)

  async function toggle(id: string, date: string) {
    if (date > today) return
    setWeek((w) => w ? { ...w, days: w.days.map((d) => d.date === date ? { ...d, tasks: d.tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t) } : d) } : w)
    try { await apiToggle(id, childId, date) } catch { /* 무시 */ }
    load(); reload()
  }

  return (
    <div className="panel">
      <div className="cal-head">
        <button type="button" className="cal-nav" aria-label="지난 주" onClick={() => setOffset((o) => o - 1)}>‹</button>
        <div className="cal-title">{shortDay(monday).md} – {shortDay(sunday).md}{offset === 0 ? ' · 이번주' : ''}</div>
        <button type="button" className="cal-nav" aria-label="다음 주" onClick={() => setOffset((o) => o + 1)}>›</button>
      </div>

      {/* 주간 목표 */}
      <div className="sechead"><h3>이번주 목표</h3><span className="count">{snapshot.weekGoals.length}개</span></div>
      {snapshot.weekGoals.map((g) => (
        <GoalRow key={g.id} goal={g}
          onEdit={canManage ? (goal) => setGoalEditor({ existing: goal }) : undefined}
          onCascade={canManage ? (goal) => setDayEditor({ date: today, prefill: { title: goal.title, category: goal.category, goalId: goal.id } }) : undefined} />
      ))}
      {snapshot.weekGoals.length === 0 && <p className="empty-hint">이번주 이루고 싶은 목표를 정해봐요! 🎯</p>}
      {canManage && (
        <div className="add-row"><button type="button" className="add-btn" onClick={() => setGoalEditor({})}>＋ 주간 목표 추가</button></div>
      )}

      {/* 날짜별 하루 계획 */}
      <div className="sechead" style={{ marginTop: 20 }}><h3>날짜별 계획</h3><span className="count">{onOpenDay ? '탭해서 자세히' : ''}</span></div>
      <div className="wk-days">
        {(week?.days ?? []).map((d) => {
          const isFuture = d.date > today
          const sd = shortDay(d.date)
          const doneN = d.tasks.filter((t) => t.done).length
          return (
            <div key={d.date} className={`wk-day${d.isToday ? ' today' : ''}`}>
              <button type="button" className="wk-dhead" onClick={onOpenDay}>
                <span className="wk-dw">{sd.wd}</span>
                <span className="wk-dd">{sd.md}</span>
                {d.tasks.length > 0 && <span className="wk-cnt">{doneN}/{d.tasks.length}</span>}
                {d.isToday && <span className="wk-todaytag">오늘</span>}
              </button>
              {d.tasks.map((t) => (
                <TaskRow key={t.id} task={t} onToggle={!isFuture ? (id) => toggle(id, d.date) : undefined} />
              ))}
              {d.tasks.length === 0 && <div className="wk-empty">계획 없음</div>}
              {canManage && (
                <button type="button" className="wk-add" onClick={() => setDayEditor({ date: d.date })}>＋ 이 날 할일 추가</button>
              )}
            </div>
          )
        })}
      </div>

      {goalEditor && canManage && (
        <TaskEditor childId={childId} period="week" existing={goalEditor.existing}
          onClose={() => setGoalEditor(null)} onSaved={reload} />
      )}
      {dayEditor && canManage && (
        <TaskEditor childId={childId} period="day" targetDate={dayEditor.date} prefill={dayEditor.prefill}
          defaultRecur={dayEditor.prefill ? 'daily' : 'once'}
          onClose={() => setDayEditor(null)} onSaved={() => { load(); reload() }} />
      )}
    </div>
  )
}
