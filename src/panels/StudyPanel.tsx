import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../state/store'
import { useAuth } from '../auth/AuthProvider'
import {
  getStudy, createSession, deleteSession, createSubject, DEMO_FAMILY,
  type StudySnapshot, type Subject, type StudyDay, type StudyGoal,
} from '../api'
import { StudyGoalProgress } from '../components/StudyGoalProgress'
import { StudyGoalEditor } from '../components/StudyGoalEditor'

type View = 'today' | 'week' | 'month'
const VIEWS: { id: View; label: string }[] = [
  { id: 'today', label: '오늘' }, { id: 'week', label: '주' }, { id: 'month', label: '월' },
]
const SUBJECT_COLORS = ['#9A86E8', '#2FB79A', '#FF9A6B', '#FF7EA6', '#FFC94D', '#7FB2F0', '#F0729A', '#6FCF97']

function fmt(min: number): string {
  if (min <= 0) return '0분'
  const h = Math.floor(min / 60), m = min % 60
  return h > 0 ? (m > 0 ? `${h}시간 ${m}분` : `${h}시간`) : `${m}분`
}
function clock(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

// 진행 중인 타이머를 localStorage에 보존 → 탭 전환·앱 종료해도 시작 시각 기준으로 이어짐
interface TimerState { baseSec: number; startedAt: number | null; subjectId: string | null; pomodoro: boolean }
function readTimer(key: string): TimerState | null {
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}

/** 순공시간 탭 — 정직한 스톱워치(순공 실측) + 과목 기록 + 오늘/주/월 시각화.
 *  순위·경쟁 없음, '나의 기록·성취'로. 시간엔 별점 미지급. */
export function StudyPanel() {
  const { childId } = useApp()
  const { status, familyId } = useAuth()
  const fam = status === 'demo' ? DEMO_FAMILY : familyId ?? DEMO_FAMILY
  const canManage = status !== 'demo'

  const [data, setData] = useState<StudySnapshot | null>(null)
  const [view, setView] = useState<View>('today')

  // 타이머 상태 (정직한 스톱워치: 일시정지 시 순공에서 제외). localStorage에 보존해 창을 닫아도 이어짐
  const STORE_KEY = `aimgrim_timer_${childId}`
  const [baseSec, setBaseSec] = useState(() => readTimer(STORE_KEY)?.baseSec ?? 0)
  const [startedAt, setStartedAt] = useState<number | null>(() => readTimer(STORE_KEY)?.startedAt ?? null) // 진행 중이면 ms
  const [tick, setTick] = useState(0)
  const [subject, setSubject] = useState<Subject | null>(null)
  const [pomodoro, setPomodoro] = useState(() => readTimer(STORE_KEY)?.pomodoro ?? false)
  const [saveSheet, setSaveSheet] = useState<{ minutes: number } | null>(null)
  const [goalEdit, setGoalEdit] = useState<StudyGoal | 'new' | null>(null)
  const intRef = useRef<number | null>(null)

  function load() { getStudy(fam, childId).then(setData).catch(() => setData(null)) }
  useEffect(load, [fam, childId])

  // 기본 과목 선택 (진행 중이던 타이머의 과목을 우선 복원)
  useEffect(() => {
    if (subject || !data?.subjects.length) return
    const savedId = readTimer(STORE_KEY)?.subjectId
    setSubject(data.subjects.find((s) => s.id === savedId) ?? data.subjects[0])
  }, [data, subject, STORE_KEY])

  // 타이머 상태를 localStorage에 보존 (없으면 삭제)
  useEffect(() => {
    try {
      if (baseSec === 0 && startedAt === null) localStorage.removeItem(STORE_KEY)
      else localStorage.setItem(STORE_KEY, JSON.stringify({ baseSec, startedAt, subjectId: subject?.id ?? null, pomodoro }))
    } catch { /* localStorage 불가 환경 무시 */ }
  }, [baseSec, startedAt, subject, pomodoro, STORE_KEY])

  const active = startedAt !== null
  const elapsedSec = baseSec + (active ? Math.floor((Date.now() - startedAt!) / 1000) : 0)

  useEffect(() => {
    if (!active) { if (intRef.current) { window.clearInterval(intRef.current); intRef.current = null }; return }
    intRef.current = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => { if (intRef.current) window.clearInterval(intRef.current) }
  }, [active])
  void tick

  function start() { if (!subject) return; setStartedAt(Date.now()) }
  function pause() { setBaseSec(elapsedSec); setStartedAt(null) }
  function resume() { setStartedAt(Date.now()) }
  function stop() {
    const total = elapsedSec
    setBaseSec(0); setStartedAt(null)
    const minutes = Math.round(total / 60)
    if (minutes >= 1) setSaveSheet({ minutes })
  }
  function reset() { setBaseSec(0); setStartedAt(null) }

  if (!data) return <div className="panel"><p className="empty-hint">불러오는 중… ⏱</p></div>

  const pomoTarget = 25 * 60
  const pomoHit = pomodoro && elapsedSec >= pomoTarget

  return (
    <div className="panel">
      <div className="daterow"><span className="big">순공시간</span><span className="sub">순수하게 공부한 시간, 나의 기록 ⏱</span></div>

      {/* 순공 기간 누적목표 — 한눈에 누적 달성 */}
      {data.goals.map((g) => (
        <StudyGoalProgress key={g.id} goal={g} todayMin={data.today.totalMin}
          onEdit={canManage ? () => setGoalEdit(g) : undefined} />
      ))}
      {canManage && data.goals.length === 0 && (
        <button type="button" className="sg-add-cta" onClick={() => setGoalEdit('new')}>＋ 방학 순공 목표 세우기 (예: 200시간)</button>
      )}

      {/* 타이머 */}
      <div className="timer-card">
        <div className="tm-clock" aria-live="polite">{clock(elapsedSec)}</div>
        {pomoHit && <div className="tm-pomo">🍅 25분 집중 완료! 잠깐 쉬어도 좋아요</div>}
        <SubjectPicker subjects={data.subjects} value={subject} onChange={setSubject}
          childId={childId} canManage={canManage} onAdded={load} />
        <div className="tm-btns">
          {!active && elapsedSec === 0 && (
            <button type="button" className="btn primary block" disabled={!subject} onClick={start}>▶ 공부 시작</button>
          )}
          {active && (
            <>
              <button type="button" className="tm-sec" onClick={pause}>⏸ 잠깐 멈춤</button>
              <button type="button" className="btn primary" onClick={stop}>■ 끝내고 기록</button>
            </>
          )}
          {!active && elapsedSec > 0 && (
            <>
              <button type="button" className="tm-sec" onClick={reset}>취소</button>
              <button type="button" className="tm-sec" onClick={resume}>▶ 이어서</button>
              <button type="button" className="btn primary" onClick={stop}>■ 끝내고 기록</button>
            </>
          )}
        </div>
        <label className="tm-pomotoggle">
          <input type="checkbox" checked={pomodoro} onChange={(e) => setPomodoro(e.target.checked)} />
          <span>25분 집중(뽀모도로) 알림</span>
        </label>
      </div>

      {/* 통계 뷰 전환 */}
      <div className="view-seg" role="tablist" aria-label="기간 전환" style={{ padding: '4px 0 8px' }}>
        {VIEWS.map((v) => (
          <button key={v.id} type="button" role="tab" aria-selected={view === v.id}
            className={view === v.id ? 'on' : ''} onClick={() => setView(v.id)}>{v.label}</button>
        ))}
      </div>

      {view === 'today' && <TodayView data={data} canManage={canManage} onChanged={load} />}
      {view === 'week' && <WeekView data={data} />}
      {view === 'month' && <MonthView data={data} />}

      {saveSheet && (
        <SessionSaveSheet minutes={saveSheet.minutes} subject={subject} subjects={data.subjects}
          childId={childId} pomodoro={pomodoro}
          onClose={() => setSaveSheet(null)} onSaved={() => { setSaveSheet(null); load() }} />
      )}
      {goalEdit && (
        <StudyGoalEditor childId={childId} today={data.date} existing={goalEdit === 'new' ? undefined : goalEdit}
          onClose={() => setGoalEdit(null)} onSaved={() => { setGoalEdit(null); load() }} />
      )}
    </div>
  )
}

/* ── 과목 선택 (칩) + 추가 ── */
function SubjectPicker({ subjects, value, onChange, childId, canManage, onAdded }: {
  subjects: Subject[]; value: Subject | null; onChange: (s: Subject) => void
  childId: string; canManage: boolean; onAdded: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  async function add() {
    const nm = name.trim()
    if (!nm) return
    const color = SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length]
    await createSubject({ childId, name: nm, color })
    setName(''); setAdding(false); onAdded()
  }
  return (
    <div className="subj-pick">
      {subjects.map((s) => (
        <button type="button" key={s.id} className={`subj-chip${value?.id === s.id ? ' on' : ''}`}
          style={value?.id === s.id ? { background: s.color, borderColor: s.color } : { borderColor: s.color }}
          onClick={() => onChange(s)}>
          <span className="subj-dot" style={{ background: value?.id === s.id ? '#fff' : s.color }} aria-hidden="true" />
          {s.name}
        </button>
      ))}
      {canManage && !adding && <button type="button" className="subj-chip add" onClick={() => setAdding(true)}>＋ 과목</button>}
      {canManage && adding && (
        <span className="subj-add">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="과목" maxLength={12} autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') add() }} />
          <button type="button" onClick={add}>✓</button>
        </span>
      )}
    </div>
  )
}

/* ── 세션 저장 시트 ── */
function SessionSaveSheet({ minutes, subject, subjects, childId, pomodoro, onClose, onSaved }: {
  minutes: number; subject: Subject | null; subjects: Subject[]; childId: string; pomodoro: boolean
  onClose: () => void; onSaved: () => void
}) {
  const [subj, setSubj] = useState<Subject | null>(subject ?? subjects[0] ?? null)
  const [min, setMin] = useState(minutes)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  async function save() {
    if (!subj || min < 1) return
    setBusy(true)
    try {
      await createSession({ childId, subjectId: subj.id, subjectName: subj.name, color: subj.color, minutes: min, note: note.trim(), mode: pomodoro ? 'pomodoro' : 'stopwatch' })
      onSaved()
    } catch { setBusy(false) }
  }
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="공부 시간 기록">
        <div className="grip" />
        <h3>순공 {fmt(min)} 기록 ⏱</h3>
        <div className="form" style={{ marginTop: 10 }}>
          <div className="field">
            <label>과목</label>
            <div className="subj-pick">
              {subjects.map((s) => (
                <button type="button" key={s.id} className={`subj-chip${subj?.id === s.id ? ' on' : ''}`}
                  style={subj?.id === s.id ? { background: s.color, borderColor: s.color } : { borderColor: s.color }}
                  onClick={() => setSubj(s)}>{s.name}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>시간 (분)</label>
            <div className="stepper">
              <button type="button" onClick={() => setMin((m) => Math.max(1, m - 5))} aria-label="줄이기">−</button>
              <span className="pv">{min}분</span>
              <button type="button" onClick={() => setMin((m) => Math.min(600, m + 5))} aria-label="늘리기">+</button>
            </div>
          </div>
          <div className="field">
            <label htmlFor="s-note">무엇을 공부했어? (선택)</label>
            <input id="s-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 수학 32~35쪽" maxLength={60} />
          </div>
          <button type="button" className="btn primary block" disabled={busy || !subj} onClick={save}>{busy ? '저장 중…' : '기록하기'}</button>
        </div>
      </div>
    </div>
  )
}

/* ── 오늘: 총합 + 과목별 가로 막대 + 세션 리스트 ── */
function TodayView({ data, canManage, onChanged }: { data: StudySnapshot; canManage: boolean; onChanged: () => void }) {
  const { sessions, totalMin } = data.today
  const bySub = useMemo(() => {
    const m = new Map<string, { name: string; color: string; min: number }>()
    for (const s of sessions) {
      const e = m.get(s.subjectName) ?? { name: s.subjectName, color: s.color, min: 0 }
      e.min += s.minutes; m.set(s.subjectName, e)
    }
    return [...m.values()].sort((a, b) => b.min - a.min)
  }, [sessions])

  async function remove(id: string) { await deleteSession(id); onChanged() }

  return (
    <div className="study-body">
      <div className="big-total"><span className="bt-n">{fmt(totalMin)}</span><span className="bt-l">오늘 순공</span>{data.streak > 0 && <span className="bt-streak">🔥 {data.streak}일째</span>}</div>

      {totalMin > 0 && (
        <>
          <div className="split-bar" role="img" aria-label="오늘 과목별 순공 비율">
            {bySub.map((s) => <span key={s.name} style={{ width: `${(s.min / totalMin) * 100}%`, background: s.color }} title={`${s.name} ${fmt(s.min)}`} />)}
          </div>
          <Legend items={bySub} />
        </>
      )}

      <div className="sechead" style={{ marginTop: 14 }}><h3>오늘 기록</h3><span className="count">{sessions.length}개</span></div>
      {sessions.map((s) => (
        <div key={s.id} className="sess">
          <span className="sess-dot" style={{ background: s.color }} aria-hidden="true" />
          <span className="sess-mid">
            <span className="sess-t">{s.subjectName} · {fmt(s.minutes)}</span>
            {s.note && <span className="sess-note">{s.note}</span>}
          </span>
          {canManage && <button type="button" className="sess-del" aria-label="삭제" onClick={() => remove(s.id)}>🗑</button>}
        </div>
      ))}
      {sessions.length === 0 && <p className="empty-hint">위 타이머로 공부를 시작해 오늘 순공을 쌓아봐요 🌱</p>}
    </div>
  )
}

/* ── 주: 요일별 과목색 누적 세로 막대 ── */
function WeekView({ data }: { data: StudySnapshot }) {
  const { days, total, maxMin } = data.week
  const WD = ['월', '화', '수', '목', '금', '토', '일']
  const legend = subjectsIn(days)
  return (
    <div className="study-body">
      <div className="big-total"><span className="bt-n">{fmt(total)}</span><span className="bt-l">이번주 순공</span></div>
      <div className="wbars">
        {days.map((d, i) => {
          const h = maxMin > 0 ? Math.round((d.totalMin / maxMin) * 108) : 0
          return (
            <div key={d.date} className="wbar-col">
              <div className="wbar-track" title={`${WD[i]} ${fmt(d.totalMin)}`}>
                <div className="wbar-stack" style={{ height: `${h}%` }}>
                  {(d.bySubject ?? []).map((s) => (
                    <span key={s.name} className="wbar-seg" style={{ flexGrow: s.min, background: s.color }} />
                  ))}
                </div>
              </div>
              <span className={`wbar-wd${d.isToday ? ' today' : ''}`}>{WD[i]}</span>
              <span className="wbar-min">{d.totalMin > 0 ? Math.round(d.totalMin / 60 * 10) / 10 + 'h' : '·'}</span>
            </div>
          )
        })}
      </div>
      {legend.length > 0 && <Legend items={legend} />}
    </div>
  )
}

/* ── 월: 순공 히트맵(민트 단일 명도) ── */
function MonthView({ data }: { data: StudySnapshot }) {
  const { days, total, maxMin, start } = data.month
  const WD = ['일', '월', '화', '수', '목', '금', '토']
  const lead = new Date(start + 'T00:00:00Z').getUTCDay() // 1일의 요일
  const level = (min: number) => {
    if (min <= 0 || maxMin <= 0) return 0
    const r = min / maxMin
    return r > 0.66 ? 3 : r > 0.33 ? 2 : 1
  }
  return (
    <div className="study-body">
      <div className="big-total"><span className="bt-n">{fmt(total)}</span><span className="bt-l">이번달 순공</span>{data.streak > 0 && <span className="bt-streak">🔥 {data.streak}일째</span>}</div>
      <div className="heat">
        {WD.map((w) => <div key={w} className="heat-wd">{w}</div>)}
        {Array.from({ length: lead }).map((_, i) => <div key={'x' + i} className="heat-cell mut" />)}
        {days.map((d) => (
          <div key={d.date} className={`heat-cell lv${level(d.totalMin)}`} title={`${d.date.slice(8)}일 ${fmt(d.totalMin)}`}>
            {Number(d.date.slice(8))}
          </div>
        ))}
      </div>
      <div className="heat-legend"><span>적음</span><i className="lv0" /><i className="lv1" /><i className="lv2" /><i className="lv3" /><span>많음</span></div>
    </div>
  )
}

function subjectsIn(days: StudyDay[]): { name: string; color: string; min: number }[] {
  const m = new Map<string, { name: string; color: string; min: number }>()
  for (const d of days) for (const s of d.bySubject ?? []) {
    const e = m.get(s.name) ?? { name: s.name, color: s.color, min: 0 }
    e.min += s.min; m.set(s.name, e)
  }
  return [...m.values()].sort((a, b) => b.min - a.min)
}

function Legend({ items }: { items: { name: string; color: string; min: number }[] }) {
  return (
    <div className="slegend">
      {items.map((s) => (
        <span key={s.name} className="sleg"><span className="sleg-sw" style={{ background: s.color }} aria-hidden="true" />{s.name} <b>{fmt(s.min)}</b></span>
      ))}
    </div>
  )
}
