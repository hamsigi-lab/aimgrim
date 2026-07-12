import { useEffect, useState } from 'react'
import { useApp } from '../state/store'
import { useAuth } from '../auth/AuthProvider'
import { TaskEditor } from '../components/TaskEditor'
import { PlanList } from '../components/PlanList'
import { GoalChips } from '../components/GoalChips'
import { fetchWeek, toggleTask as apiToggle, DEMO_FAMILY, type WeekDayPlan } from '../api'
import { mondayISO, shiftISO, shortDay } from '../lib/calendar'
import type { ScheduleItem } from '../types'

export function WeekPanel({ onGoToGoals }: { onGoToGoals?: () => void }) {
  const { snapshot, childId, reload, showSurprise } = useApp()
  const { status, familyId } = useAuth()
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [dayEditor, setDayEditor] = useState<{ date: string; existing?: ScheduleItem } | null>(null)
  const [week, setWeek] = useState<{ today: string; days: WeekDayPlan[] } | null>(null)

  const fam = status === 'demo' ? DEMO_FAMILY : familyId ?? DEMO_FAMILY
  const anchor = snapshot?.today ?? ''
  const monday = anchor ? shiftISO(mondayISO(anchor), offset * 7) : ''
  const sunday = monday ? shiftISO(monday, 6) : ''

  function load() {
    if (!monday) return
    fetchWeek(monday, fam, childId).then(setWeek).catch(() => setWeek(null))
  }
  useEffect(load, [monday, fam, childId])

  // 주가 바뀌면 선택일을 그 주의 오늘(없으면 월요일)로
  useEffect(() => {
    if (!anchor || !monday) return
    setSelected(anchor >= monday && anchor <= sunday ? anchor : monday)
  }, [monday, sunday, anchor])

  if (!snapshot) return null
  const canManage = status !== 'demo'
  const today = week?.today ?? anchor
  const selDate = selected ?? monday
  const selDay = week?.days.find((d) => d.date === selDate)
  const tasks = selDay?.tasks ?? []
  const isFuture = selDate > today
  const sd = shortDay(selDate)

  async function toggle(id: string) {
    if (isFuture) return
    setWeek((w) => w ? { ...w, days: w.days.map((d) => d.date === selDate ? { ...d, tasks: d.tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t) } : d) } : w)
    try { const res = await apiToggle(id, childId, selDate); if (res.surprise) showSurprise(res.surprise) } catch { /* 무시 */ }
    load(); reload()
  }

  return (
    <div className="panel">
      <GoalChips label="이번주 목표" goals={snapshot.weekGoals} onOpen={onGoToGoals} />

      <div className="cal-head">
        <button type="button" className="cal-nav" aria-label="지난 주" onClick={() => setOffset((o) => o - 1)}>‹</button>
        <div className="cal-title">{shortDay(monday).md} – {shortDay(sunday).md}{offset === 0 ? ' · 이번주' : ''}</div>
        <button type="button" className="cal-nav" aria-label="다음 주" onClick={() => setOffset((o) => o + 1)}>›</button>
      </div>

      {/* 요일 스트립 — 주간 한눈에 + 날짜 선택 */}
      <div className="wk-strip">
        {(week?.days ?? []).map((d) => {
          const sdd = shortDay(d.date)
          const doneN = d.tasks.filter((t) => t.done).length
          return (
            <button type="button" key={d.date}
              className={`wk-cell${d.date === selDate ? ' sel' : ''}${d.isToday ? ' today' : ''}`}
              onClick={() => setSelected(d.date)}>
              <span className="wk-cw">{sdd.wd}</span>
              <span className="wk-cd">{Number(d.date.slice(8, 10))}</span>
              <span className={`wk-badge${d.tasks.length > 0 && doneN === d.tasks.length ? ' full' : ''}`}>
                {d.tasks.length > 0 ? `${doneN}/${d.tasks.length}` : '·'}
              </span>
            </button>
          )
        })}
      </div>

      {/* 선택한 날의 계획 (작성·체크) */}
      <div className="sechead" style={{ marginTop: 16 }}>
        <h3>{sd.wd}요일 {sd.md} 계획</h3>
        <span className="count">{tasks.filter((t) => t.done).length} / {tasks.length} 완료</span>
      </div>
      {isFuture && <p className="empty-hint" style={{ paddingBottom: 4 }}>다가올 계획이에요. 완료 체크는 그날 할 수 있어요.</p>}
      <PlanList tasks={tasks} goals={snapshot.goals}
        onToggle={!isFuture ? toggle : undefined}
        onEdit={canManage ? (task) => setDayEditor({ date: selDate, existing: task }) : undefined} />
      {tasks.length === 0 && !isFuture && <p className="empty-hint">이 날은 계획이 없어요. 아래에서 추가해요! 🌱</p>}
      {canManage && (
        <div className="add-row"><button type="button" className="add-btn" onClick={() => setDayEditor({ date: selDate })}>＋ 이 날 할일 추가</button></div>
      )}

      {dayEditor && canManage && (
        <TaskEditor childId={childId} period="day" existing={dayEditor.existing} targetDate={dayEditor.date} defaultRecur="once"
          onClose={() => setDayEditor(null)} onSaved={() => { load(); reload() }} />
      )}
    </div>
  )
}
