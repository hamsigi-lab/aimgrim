import { useEffect, useState } from 'react'
import { useApp } from '../state/store'
import { useAuth } from '../auth/AuthProvider'
import { PlanList } from '../components/PlanList'
import { TaskEditor } from '../components/TaskEditor'
import { NoteEditor } from '../components/NoteEditor'
import { EncourageComposer } from '../components/EncourageComposer'
import { TemplatePicker } from '../components/TemplatePicker'
import { approveTask, toggleTask as apiToggle, fetchDayTasks, getStudy, DEMO_FAMILY, type StudySnapshot } from '../api'
import { dateHeader, shiftISO } from '../lib/calendar'
import type { ScheduleItem } from '../types'

const fh = (m: number) => `${Math.round((m / 60) * 10) / 10}시간`

export function TodayPanel({ onGoToStudy }: { onGoToStudy?: () => void }) {
  const { snapshot, childId, toggleTask, reload } = useApp()
  const { status, me, familyId } = useAuth()
  const [editor, setEditor] = useState<{ existing?: ScheduleItem } | null>(null)
  const [noteFor, setNoteFor] = useState<ScheduleItem | null>(null)
  const [encourage, setEncourage] = useState(false)
  const [templates, setTemplates] = useState(false)
  const [viewDate, setViewDate] = useState<string | null>(null)
  const [otherTasks, setOtherTasks] = useState<ScheduleItem[] | null>(null)
  const [otherBusy, setOtherBusy] = useState(false)
  const [study, setStudy] = useState<StudySnapshot | null>(null)

  const fam = status === 'demo' ? DEMO_FAMILY : familyId ?? DEMO_FAMILY
  const today = snapshot?.today ?? ''
  const date = viewDate ?? today
  const isToday = date === today
  const isFuture = date > today

  useEffect(() => {
    if (isToday) { setOtherTasks(null); return }
    setOtherBusy(true)
    fetchDayTasks(date, fam, childId)
      .then((r) => setOtherTasks(r.tasks))
      .catch(() => setOtherTasks([]))
      .finally(() => setOtherBusy(false))
  }, [date, isToday, fam, childId])

  // 순공 요약(오늘 순공 + 방학 누적목표) — 계획 탭에 자동 반영
  useEffect(() => { getStudy(fam, childId).then(setStudy).catch(() => setStudy(null)) }, [fam, childId])

  if (!snapshot) return null

  const canManage = status !== 'demo'
  const isParent = canManage && me?.member?.role === 'parent'
  const isChild = !isParent
  const header = dateHeader(date, today)

  const tasks = isToday ? snapshot.todayTasks : (otherTasks ?? [])
  const doneCount = tasks.filter((t) => t.done).length
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0
  const canToggle = !isFuture

  function refetchOther() {
    fetchDayTasks(date, fam, childId).then((r) => setOtherTasks(r.tasks)).catch(() => {})
    reload()
  }
  async function onApprove(id: string) {
    await approveTask(id)
    if (isToday) reload(); else refetchOther()
  }
  async function handleToggle(id: string) {
    if (isToday) { toggleTask(id); return }
    if (isFuture) return
    setOtherTasks((prev) => prev ? prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) : prev)
    try { await apiToggle(id, childId, date) } catch { /* 무시 */ }
    refetchOther()
  }
  function afterNote() { if (isToday) reload(); else refetchOther() }

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

      {/* 오늘 할일 — 화면 주인공. 진행 요약 + 큰 카드 평면 리스트(목표는 색·꼬리표로만) */}
      <div className="today-sum">
        <div className="ts-top">
          <h3>{isToday ? '오늘 할일' : '이 날 할일'}</h3>
          <span className="ts-count"><b>{doneCount}</b> / {tasks.length} 완료</span>
        </div>
        {tasks.length > 0 && <div className="ts-bar"><span className="ts-fill" style={{ width: `${pct}%` }} /></div>}
      </div>

      {/* 순공 자동 요약 — 매일 순공하면 여기 자동 반영 (탭하면 순공 탭) */}
      {isToday && study && (study.today.totalMin > 0 || study.goals.length > 0) && (
        <button type="button" className="study-strip" onClick={onGoToStudy}>
          <span className="ss-today">⏱ 오늘 순공 <b>{fh(study.today.totalMin)}</b></span>
          {study.goals[0] && (
            <span className="ss-goal">{fh(study.goals[0].accumulatedMin)}/{fh(study.goals[0].targetMin)}{study.goals[0].daysLeft >= 0 ? ` · D-${study.goals[0].daysLeft}` : ''}</span>
          )}
          <span className="ss-arrow" aria-hidden="true">›</span>
        </button>
      )}

      {isFuture && <p className="empty-hint" style={{ paddingBottom: 6 }}>다가올 계획이에요. 완료 체크는 그날 할 수 있어요.</p>}

      <PlanList
        tasks={tasks} goals={snapshot.goals} forceFlat
        onToggle={canToggle ? handleToggle : undefined}
        onEdit={canManage && isToday ? (task) => setEditor({ existing: task }) : undefined}
        onNote={canManage ? (task) => setNoteFor(task) : undefined}
        canApprove={isParent && canToggle} onApprove={onApprove}
      />

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

      {isParent && isToday && (
        <div className="approve" style={{ marginTop: 14, marginBottom: 0 }}>
          <span className="ai" aria-hidden="true">🧡</span>
          <span className="atx">아이가 해낸 일을 확인하고 응원해 주세요</span>
          <button type="button" className="abtn" onClick={() => setEncourage(true)}>격려 보내기</button>
        </div>
      )}

      {editor && canManage && (
        <TaskEditor childId={childId} period="day" existing={editor.existing}
          onClose={() => setEditor(null)} onSaved={reload} />
      )}
      {noteFor && canManage && (
        <NoteEditor task={noteFor} childId={childId} date={date}
          onClose={() => setNoteFor(null)} onSaved={afterNote} />
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
