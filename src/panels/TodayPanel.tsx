import { useEffect, useState } from 'react'
import { useApp } from '../state/store'
import { useAuth } from '../auth/AuthProvider'
import { TaskRow } from '../components/TaskRow'
import { QuickAddTask } from '../components/QuickAddTask'
import { NoteEditor } from '../components/NoteEditor'
import { EncourageComposer } from '../components/EncourageComposer'
import { TemplatePicker } from '../components/TemplatePicker'
import { approveTask, toggleTask as apiToggle, fetchDayTasks, copyDay, DEMO_FAMILY } from '../api'
import { dateHeader, shiftISO } from '../lib/calendar'
import type { ScheduleItem } from '../types'

function fmtT(m: number): string { const h = Math.floor(m / 60), mm = m % 60; const ap = h < 12 ? '오전' : '오후'; const hh = h % 12 || 12; return `${ap} ${hh}${mm ? ':' + String(mm).padStart(2, '0') : '시'}` }
// 계획표 왼쪽 시간 거터 (24시 표기, 생활계획표처럼) — 7:30, 16:20
const fmtGut = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
function NowMarker({ min, atEnd }: { min: number; atEnd?: boolean }) {
  return <div className={`now-marker${atEnd ? ' end' : ''}`}><span className="nm-dot" aria-hidden="true" /><span className="nm-lab">지금 {fmtT(min)}</span><span className="nm-line" aria-hidden="true" /></div>
}

export function TodayPanel() {
  const { snapshot, childId, toggleTask, reload, refresh } = useApp()
  const { status, me, familyId } = useAuth()
  const [editor, setEditor] = useState<ScheduleItem | null>(null) // ✎ 고치기(시간·반복·별점·삭제)
  const [adding, setAdding] = useState(false)                     // ＋ 간단 추가(여러 항목)
  const [noteFor, setNoteFor] = useState<ScheduleItem | null>(null)
  const [encourage, setEncourage] = useState(false)
  const [templates, setTemplates] = useState(false)
  const [viewDate, setViewDate] = useState<string | null>(null)
  const [otherTasks, setOtherTasks] = useState<ScheduleItem[] | null>(null)
  const [otherBusy, setOtherBusy] = useState(false)
  const [copying, setCopying] = useState(false)
  const [nowMin, setNowMin] = useState(() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() })
  useEffect(() => { const t = window.setInterval(() => { const d = new Date(); setNowMin(d.getHours() * 60 + d.getMinutes()) }, 60000); return () => window.clearInterval(t) }, [])

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

  if (!snapshot) return null

  const canManage = status !== 'demo'
  const isParent = canManage && me?.member?.role === 'parent'
  const isChild = !isParent
  const header = dateHeader(date, today)

  const tasks = isToday ? snapshot.todayTasks : (otherTasks ?? [])
  const canToggle = !isFuture
  // 왼쪽 시간·오른쪽 할일. 시간 있는 건 시간순, 없는 건 '언제든'으로 뒤에.
  const timed = tasks.filter((t) => t.startMin != null).slice().sort((a, b) => (a.startMin! - b.startMin!) || ((a.endMin ?? 0) - (b.endMin ?? 0)))
  const untimed = tasks.filter((t) => t.startMin == null)
  // 같은 시간대(시작·끝)끼리 묶어 한 시간 아래 여러 항목으로 표시
  const groups: { startMin: number; endMin: number | null; items: ScheduleItem[] }[] = []
  for (const t of timed) {
    const g = groups[groups.length - 1]
    if (g && g.startMin === t.startMin && g.endMin === (t.endMin ?? null)) g.items.push(t)
    else groups.push({ startMin: t.startMin!, endMin: t.endMin ?? null, items: [t] })
  }
  const markerIdx = isToday ? groups.findIndex((g) => g.startMin > nowMin) : -1
  let curIdx = -1
  if (isToday) for (let i = 0; i < groups.length; i++) { const g = groups[i]; if (g.startMin <= nowMin && (g.endMin == null || nowMin < g.endMin)) curIdx = i }

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
    if (!wasDone && t) setNoteFor(t) // 체크하는 순간 기록 창 먼저 오픈
    if (isToday) { toggleTask(id); return }
    if (isFuture) return
    setOtherTasks((prev) => prev ? prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x)) : prev)
    try { await apiToggle(id, childId, date) } catch { /* 무시 */ }
    refetchOther()
  }
  function afterNote() { if (isToday) refresh(); else refetchOther() }
  function afterSave() { if (isToday) reload(); else refetchOther() }
  // '어제 계획 가져오기' — 어제 하루 계획을 오늘로 복사(이미 있는 건 건너뜀)
  async function copyYesterday() {
    if (copying) return
    setCopying(true)
    try {
      const r = await copyDay(fam, { childId, from: shiftISO(today, -1), to: today })
      reload()
      if (r.added === 0) window.alert('어제 계획 중 새로 가져올 게 없어요. (이미 오늘 있거나 매일 반복 중)')
    } catch { window.alert('가져오지 못했어요. 잠시 후 다시 시도해 주세요.') }
    finally { setCopying(false) }
  }

  const rowProps = (t: ScheduleItem) => ({
    task: t,
    onToggle: canToggle ? handleToggle : undefined,
    onEdit: canManage && isToday ? (task: ScheduleItem) => setEditor(task) : undefined,
    onNote: canManage ? (task: ScheduleItem) => setNoteFor(task) : undefined,
    canApprove: isParent && canToggle, onApprove,
  })

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
      </div>

      {isFuture && <p className="empty-hint" style={{ paddingBottom: 6 }}>다가올 계획이에요. 완료 체크는 그날 할 수 있어요.</p>}

      {/* 하루 계획표 — 왼쪽 시간, 오른쪽 여러 할일. 각 칸 클릭 = 그 칸만 완료(+별점). */}
      {tasks.length > 0 && (
        <div className="dsched">
          {groups.map((g, i) => (
            <div key={i}>
              {isToday && markerIdx === i && <NowMarker min={nowMin} />}
              <div className={`dsgroup${isToday && curIdx === i ? ' now' : ''}`}>
                <div className="ds-time"><b>{fmtGut(g.startMin)}</b>{g.endMin != null && <span>~{fmtGut(g.endMin)}</span>}</div>
                <div className="ds-items">
                  {g.items.map((t) => <TaskRow key={t.id} hideTime {...rowProps(t)} />)}
                </div>
              </div>
            </div>
          ))}
          {isToday && markerIdx === -1 && groups.length > 0 && <NowMarker min={nowMin} atEnd />}
          {untimed.length > 0 && (
            <div className="dsgroup">
              <div className="ds-time none"><span>언제든</span></div>
              <div className="ds-items">
                {untimed.map((t) => <TaskRow key={t.id} hideTime {...rowProps(t)} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {tasks.length === 0 && !otherBusy && (
        <p className="empty-hint">
          {isToday
            ? (isChild ? '오늘 내가 해볼 일을 스스로 정해봐 🌱' : '아직 오늘 할일이 없어요. 아래에서 추가해 주세요! 🌱')
            : '이 날은 계획이 없어요.'}
        </p>
      )}

      {canManage && isToday && (
        <div className="add-row" style={{ flexDirection: 'column', gap: 8 }}>
          <button type="button" className="add-btn" onClick={() => setAdding(true)}>
            {isChild ? '＋ 오늘 할 일 추가' : '＋ 할일 추가'}
          </button>
          <button type="button" className="add-btn ghost" onClick={copyYesterday} disabled={copying}>
            {copying ? '가져오는 중…' : '⟳ 어제 계획 가져오기'}
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

      {adding && canManage && (
        <QuickAddTask childId={childId} targetDate={date} canSetPoints={isParent} onClose={() => setAdding(false)} onSaved={afterSave} />
      )}
      {editor && canManage && (
        <QuickAddTask childId={childId} targetDate={date} existing={editor} canSetPoints={isParent}
          onClose={() => setEditor(null)} onSaved={afterSave} />
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
