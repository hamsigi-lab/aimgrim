import { useEffect, useState } from 'react'
import { useApp } from '../state/store'
import { useAuth } from '../auth/AuthProvider'
import { PlanList } from '../components/PlanList'
import { TaskEditor, type Prefill } from '../components/TaskEditor'
import { NoteEditor } from '../components/NoteEditor'
import { EncourageComposer } from '../components/EncourageComposer'
import { TemplatePicker } from '../components/TemplatePicker'
import { approveTask, toggleTask as apiToggle, fetchDayTasks, getStudy, DEMO_FAMILY, type StudySnapshot } from '../api'
import { dateHeader, shiftISO } from '../lib/calendar'
import type { ScheduleItem, GoalItem } from '../types'

const fh = (m: number) => `${Math.round((m / 60) * 10) / 10}시간`
function Check() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10.5l4 4 8-9" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function Gear() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.04-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.58.24-1.12.56-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.04.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.58-.24 1.12-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z" />
    </svg>
  )
}

export function TodayPanel({ onGoToStudy, onGoToGoals }: { onGoToStudy?: () => void; onGoToGoals?: () => void }) {
  const { snapshot, childId, toggleTask, reload, refresh } = useApp()
  const { status, me, familyId } = useAuth()
  const [editor, setEditor] = useState<{ existing?: ScheduleItem; prefill?: Prefill } | null>(null)
  const [goalEdit, setGoalEdit] = useState<GoalItem | null>(null)
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
  // 이 날짜가 기간에 든 목표 = 계획에 자동 반영 (목표 탭에서 기간만 정하면 여기 보임)
  const activeGoals = snapshot.goals.filter((g) => (!g.startDate || g.startDate <= date) && (!g.endDate || g.endDate >= date))

  function refetchOther() {
    fetchDayTasks(date, fam, childId).then((r) => setOtherTasks(r.tasks)).catch(() => {})
    reload()
  }
  async function onApprove(id: string) {
    await approveTask(id)
    if (isToday) reload(); else refetchOther()
  }
  async function handleToggle(id: string) {
    const t = tasks.find((x) => x.id === id)
    const wasDone = !!t?.done
    if (isToday) { toggleTask(id); if (!wasDone && t) setNoteFor(t); return }
    if (isFuture) return
    setOtherTasks((prev) => prev ? prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x)) : prev)
    try { await apiToggle(id, childId, date) } catch { /* 무시 */ }
    if (!wasDone && t) setNoteFor(t)
    refetchOther()
  }
  // 목표를 오늘 실천 체크 (숨은 gp_ 실천 토글 → 목표 진행률 롤업). 체크 시 '오늘 한 일' 기록 유도.
  async function toggleGoal(g: GoalItem) {
    if (isFuture || !g.todayPracticeId) return
    const wasDone = !!g.todayDone
    try { await apiToggle(g.todayPracticeId, childId, date) } catch { /* 무시 */ }
    if (!wasDone) setNoteFor({ id: g.todayPracticeId, title: g.title } as unknown as ScheduleItem)
    refresh() // 로딩 화면 없이 갱신 (기록 창 유지)
  }
  function afterNote() { if (isToday) refresh(); else refetchOther() }

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

      {/* 순공 요약 — 맨 위에 크게 (탭하면 순공 탭) */}
      {isToday && study && (study.today.totalMin > 0 || study.goals.length > 0) && (
        <button type="button" className="study-strip" onClick={onGoToStudy}>
          <span className="ss-today">⏱ 오늘 순공 <b>{fh(study.today.totalMin)}</b></span>
          {study.goals[0] && (
            <span className="ss-goal">{fh(study.goals[0].accumulatedMin)}/{fh(study.goals[0].targetMin)}{study.goals[0].daysLeft >= 0 ? ` · D-${study.goals[0].daysLeft}` : ''}</span>
          )}
          <span className="ss-arrow" aria-hidden="true">›</span>
        </button>
      )}

      {/* 이 기간 목표 — 계획 탭에서 매일 체크(오른쪽 톱니바퀴로 관리) */}
      {activeGoals.length > 0 && (
        <div className="plangoals">
          <button type="button" className="pgs-head" onClick={onGoToGoals}>🎯 이 기간 목표 {activeGoals.length} <span className="pgs-more">관리 ›</span></button>
          {activeGoals.map((g) => (
            <div key={g.id} className={`pgoal${g.todayDone ? ' done' : ''}`}>
              <button type="button" className="pgoal-check" disabled={isFuture} aria-pressed={!!g.todayDone}
                aria-label={`${g.title} 오늘 실천 체크`} onClick={() => canToggle && toggleGoal(g)}><Check /></button>
              <span className="pgoal-mid">
                <span className="pgoal-t"><span className={`pg-dot ${g.category}`} aria-hidden="true" /> {g.title}{typeof g.dDay === 'number' && g.dDay >= 0 && <em className="pgoal-dday">D-{g.dDay}</em>}</span>
                <span className="pgoal-bar"><i style={{ width: `${g.progress}%` }} /></span>
                {g.todayDone && canManage && (
                  <button type="button" className="pgoal-note" onClick={() => setNoteFor({ id: g.todayPracticeId, title: g.title, note: g.todayNote ?? '' } as unknown as ScheduleItem)}>
                    {g.todayNote ? `📝 ${g.todayNote}` : '＋ 오늘 한 일 기록'}
                  </button>
                )}
              </span>
              <span className="pgoal-pct">{g.progress}%</span>
              {canManage && (
                <button type="button" className="pgoal-gear" aria-label="목표 관리" title="목표 고치기·기간 조정"
                  onClick={() => setGoalEdit(g)}><Gear /></button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 오늘 할일 — 화면 주인공. 진행 요약 + 큰 카드 평면 리스트(목표는 색·꼬리표로만) */}
      <div className="today-sum">
        <div className="ts-top">
          <h3>{isToday ? '오늘 할일' : '이 날 할일'}</h3>
          <span className="ts-count"><b>{doneCount}</b> / {tasks.length} 완료</span>
        </div>
        {tasks.length > 0 && <div className="ts-bar"><span className="ts-fill" style={{ width: `${pct}%` }} /></div>}
      </div>

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
          prefill={editor.prefill} targetDate={date} defaultRecur={editor.prefill ? 'daily' : undefined}
          onClose={() => setEditor(null)} onSaved={reload} />
      )}
      {goalEdit && canManage && (
        <TaskEditor childId={childId} period={goalEdit.period} existing={goalEdit}
          onClose={() => setGoalEdit(null)} onSaved={reload} />
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
