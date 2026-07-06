import { useEffect, useState } from 'react'
import { useApp } from '../state/store'
import { useAuth } from '../auth/AuthProvider'
import { TaskRow } from '../components/TaskRow'
import { TaskEditor } from '../components/TaskEditor'
import { EncourageComposer } from '../components/EncourageComposer'
import { TemplatePicker } from '../components/TemplatePicker'
import { approveTask, toggleTask as apiToggle, fetchDayTasks, DEMO_FAMILY } from '../api'
import { dateHeader, shiftISO } from '../lib/calendar'
import type { ScheduleItem } from '../types'

export function TodayPanel({ onGoToWeek }: { onGoToWeek?: () => void }) {
  const { snapshot, childId, toggleTask, reload } = useApp()
  const { status, me, familyId } = useAuth()
  const [editor, setEditor] = useState<{ existing?: ScheduleItem } | null>(null)
  const [encourage, setEncourage] = useState(false)
  const [templates, setTemplates] = useState(false)
  const [viewDate, setViewDate] = useState<string | null>(null)
  const [otherTasks, setOtherTasks] = useState<ScheduleItem[] | null>(null)
  const [otherBusy, setOtherBusy] = useState(false)

  const fam = status === 'demo' ? DEMO_FAMILY : familyId ?? DEMO_FAMILY
  const today = snapshot?.today ?? ''
  const date = viewDate ?? today
  const isToday = date === today
  const isFuture = date > today

  // 다른 날짜로 이동하면 그 날짜의 하루 계획을 불러온다
  useEffect(() => {
    if (isToday) { setOtherTasks(null); return }
    setOtherBusy(true)
    fetchDayTasks(date, fam, childId)
      .then((r) => setOtherTasks(r.tasks))
      .catch(() => setOtherTasks([]))
      .finally(() => setOtherBusy(false))
  }, [date, isToday, fam, childId])

  if (!snapshot) return null

  const canManage = status !== 'demo'
  const isParent = canManage && me?.member?.role === 'parent'
  const isChild = !isParent
  const weekGoals = snapshot.weekGoals
  const header = dateHeader(date, today)

  const tasks = isToday ? snapshot.todayTasks : (otherTasks ?? [])
  const doneCount = tasks.filter((t) => t.done).length
  const canToggle = !isFuture

  async function onApprove(id: string) {
    await approveTask(id)
    if (isToday) reload(); else refetchOther()
  }
  function refetchOther() {
    fetchDayTasks(date, fam, childId).then((r) => setOtherTasks(r.tasks)).catch(() => {})
    reload() // 별점 반영
  }
  async function handleToggle(id: string) {
    if (isToday) { toggleTask(id); return }
    if (isFuture) return
    // 지난 날짜: 낙관적 갱신 없이 서버 반영 후 재조회
    setOtherTasks((prev) => prev ? prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) : prev)
    try { await apiToggle(id, childId, date) } catch { /* 무시 */ }
    refetchOther()
  }

  return (
    <div className="panel">
      <div className="daterow">
        <button type="button" className="date-arrow" aria-label="이전 날" onClick={() => setViewDate(shiftISO(date, -1))}>‹</button>
        <span className="date-mid">
          <span className="big">{header.big}</span>
          <span className="sub">{header.sub}</span>
        </span>
        <button type="button" className="date-arrow" aria-label="다음 날" onClick={() => setViewDate(shiftISO(date, 1))}>›</button>
        {!isToday && <button type="button" className="date-today" onClick={() => setViewDate(today)}>오늘로</button>}
        {isToday && snapshot.streak > 0 && <span className="streak-chip">🔥 {snapshot.streak}일째</span>}
      </div>

      {isToday && weekGoals.length > 0 && (
        <button type="button" className="wg-mini" onClick={onGoToWeek}>
          <span className="wg-lab">🎯 이번주 목표 {weekGoals.length}</span>
          <span className="wg-strip">
            {weekGoals.map((g) => (
              <span className="wg-pill" key={g.id}>
                <span className={`wg-dot ${g.category}`} aria-hidden="true" />
                <span className="wg-name">{g.title}</span>
                <span className="wg-pct">{g.progress}%</span>
              </span>
            ))}
          </span>
        </button>
      )}

      {isParent && isToday && (
        <div className="approve">
          <span className="ai" aria-hidden="true">🧡</span>
          <span className="atx">아이가 해낸 일을 확인하고 응원해 주세요</span>
          <button type="button" className="abtn" onClick={() => setEncourage(true)}>격려 보내기</button>
        </div>
      )}

      <div className="sechead">
        <h3>{isToday ? '오늘 할일' : '이 날 할일'}</h3>
        <span className="count">{doneCount} / {tasks.length} 완료</span>
      </div>

      {isFuture && <p className="empty-hint" style={{ paddingBottom: 6 }}>다가올 계획이에요. 완료 체크는 그날 할 수 있어요.</p>}

      {tasks.map((t) => (
        <TaskRow
          key={t.id} task={t} onToggle={canToggle ? handleToggle : undefined}
          onEdit={canManage && isToday ? (task) => setEditor({ existing: task }) : undefined}
          canApprove={isParent && canToggle} onApprove={onApprove}
        />
      ))}

      {tasks.length === 0 && !otherBusy && (
        <p className="empty-hint">
          {isToday
            ? (isChild ? '오늘 내가 해볼 일을 스스로 정해봐 🌱' : '아직 오늘 할일이 없어요. 추천 루틴으로 시작하거나 직접 추가해 주세요! 🌱')
            : '이 날은 계획이 없어요.'}
        </p>
      )}

      {canManage && isToday && (
        <div className="add-row" style={{ flexDirection: 'column', gap: 8 }}>
          <button type="button" className="add-btn" onClick={() => setEditor({})}>
            {isChild ? '＋ 오늘 내가 할 일 정하기' : '＋ 할일 추가'}
          </button>
          {snapshot.todayTasks.length === 0 && (
            <button type="button" className="add-btn tpl" onClick={() => setTemplates(true)}>✨ 추천 루틴으로 시작하기</button>
          )}
        </div>
      )}

      {editor && canManage && (
        <TaskEditor childId={childId} period="day" existing={editor.existing}
          onClose={() => setEditor(null)} onSaved={reload} />
      )}
      {encourage && isParent && (
        <EncourageComposer childId={childId} onClose={() => setEncourage(false)} onSaved={reload} />
      )}
      {templates && canManage && (
        <TemplatePicker childId={childId} onClose={() => setTemplates(false)} onSaved={reload} />
      )}
    </div>
  )
}
