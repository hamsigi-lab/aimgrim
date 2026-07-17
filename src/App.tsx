import { useEffect, useRef, useState } from 'react'
import { AppProvider, useApp } from './state/store'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { Onboarding } from './onboarding/Onboarding'
import { AddChildScreen } from './onboarding/AddChildScreen'
import { ParentHome } from './parent/ParentHome'
import { GoalsPanel } from './panels/GoalsPanel'
import { TodayPanel } from './panels/TodayPanel'
import { WeekPanel } from './panels/WeekPanel'
import { MonthPanel } from './panels/MonthPanel'
import { StudyPanel } from './panels/StudyPanel'
import { PointsPanel } from './panels/PointsPanel'
import { CalendarPanel } from './panels/CalendarPanel'
import { MenuSheet } from './components/MenuSheet'
import { SurpriseBox } from './components/SurpriseBox'
import { Mascot } from './components/Mascot'

type BottomTab = 'goals' | 'plan' | 'study' | 'points' | 'calendar'
type PlanView = 'day' | 'week' | 'month'

// 하단 탭 = 구별되는 섹션(서비스)
const NAV: { id: BottomTab; icon: string; label: string }[] = [
  { id: 'goals', icon: '🎯', label: '목표' },
  { id: 'plan', icon: '📋', label: '계획' },
  { id: 'study', icon: '⏱', label: '순공' },
  { id: 'points', icon: '⭐', label: '별점' },
  { id: 'calendar', icon: '📆', label: '캘린더' },
]

// 계획 안의 뷰 세그먼트 = 같은 계획의 줌 레벨
const PLAN_SEG: { id: PlanView; label: string }[] = [
  { id: 'day', label: '날짜' },
  { id: 'week', label: '주' },
  { id: 'month', label: '월' },
]

function Splash() {
  return (
    <div className="app">
      <div className="loadwrap">
        <div className="loadmascot"><Mascot /></div>
        <p>불러오는 중…</p>
      </div>
    </div>
  )
}

function Shell() {
  const { loading, error, snapshot, points, celebrateTick, lastGain, reload, surprise, clearSurprise } = useApp()
  const { status, exitDemo, exitToHome, me } = useAuth()
  const isParent = status !== 'demo' && me?.member?.role === 'parent'
  const [tab, setTab] = useState<BottomTab>('plan')
  const [planView, setPlanView] = useState<PlanView>('day')
  const [bump, setBump] = useState(false)
  const [floatKey, setFloatKey] = useState(0)
  const [celebrating, setCelebrating] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const isDemo = status === 'demo'

  useEffect(() => {
    if (celebrateTick === 0) return
    setBump(true)
    setFloatKey((k) => k + 1)
    setCelebrating(true)
    const t1 = window.setTimeout(() => setBump(false), 520)
    const t2 = window.setTimeout(() => setCelebrating(false), 700)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
  }, [celebrateTick])

  function go(next: BottomTab) {
    setTab(next)
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }
  function goPlan(view: PlanView) {
    setPlanView(view)
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }

  if (loading) return <Splash />
  if (error || !snapshot) {
    return (
      <div className="app">
        <div className="loadwrap">
          <div className="loadmascot"><Mascot /></div>
          <p>{error ?? '데이터를 불러오지 못했어요.'}</p>
          <button type="button" className="retry" onClick={reload}>다시 시도</button>
        </div>
      </div>
    )
  }

  const pendingApprovals = snapshot.todayTasks.filter((t) => t.done && !t.approved).length

  return (
    <div className="app">
      {isDemo && (
        <div className="demobar">
          <span className="db-txt">👀 체험 모드예요 — 우리 가족으로 시작해 볼까요?</span>
          <button type="button" className="db-btn" onClick={exitDemo}>시작하기</button>
        </div>
      )}

      <header className="appbar">
        {isParent && (
          <button type="button" className="menu-btn" aria-label="뒤로" onClick={exitToHome} style={{ marginRight: 2 }}>‹</button>
        )}
        <div className="hi">
          <div className="greet">
            {isParent ? '아이의 하루를 함께 봐요 💛' : '안녕, 오늘도 반가워 👋'}
            {isParent && pendingApprovals > 0 && <span className="pending-badge">확인 {pendingApprovals}</span>}
          </div>
          <div className="name">{snapshot.child.name}의 하루</div>
        </div>
        <div className={`points${bump ? ' bump' : ''}`} aria-label={`모은 별점 ${points}점`}>
          <span className="star" aria-hidden="true">⭐</span><b>{points}</b>
        </div>
        {!isDemo && (
          <button type="button" className="menu-btn" aria-label="메뉴" onClick={() => setMenuOpen(true)}>⋯</button>
        )}
      </header>

      {tab === 'plan' && (
        <div className="view-seg" role="tablist" aria-label="보기 전환">
          {PLAN_SEG.map((s) => (
            <button key={s.id} type="button" role="tab" aria-selected={planView === s.id}
              className={planView === s.id ? 'on' : ''} onClick={() => goPlan(s.id)}>{s.label}</button>
          ))}
        </div>
      )}

      <main className="body" ref={bodyRef}>
        {floatKey > 0 && <div className="float go" key={floatKey} aria-hidden="true">+{lastGain}</div>}
        {tab === 'goals' && <GoalsPanel />}
        {tab === 'plan' && planView === 'day' && <TodayPanel onGoToStudy={() => go('study')} onGoToGoals={() => go('goals')} />}
        {tab === 'plan' && planView === 'week' && <WeekPanel onGoToGoals={() => go('goals')} />}
        {tab === 'plan' && planView === 'month' && <MonthPanel onOpenDay={() => goPlan('day')} onGoToGoals={() => go('goals')} />}
        {tab === 'study' && <StudyPanel />}
        {tab === 'points' && <PointsPanel celebrating={celebrating} />}
        {tab === 'calendar' && <CalendarPanel />}
      </main>

      <nav className="nav" aria-label="화면 이동">
        {NAV.map((n) => (
          <button key={n.id} type="button" className={tab === n.id ? 'on' : ''}
            aria-current={tab === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
            <span className="ni" aria-hidden="true">{n.icon}</span>
            <span className="nl">{n.label}</span>
          </button>
        ))}
      </nav>

      {menuOpen && <MenuSheet onClose={() => setMenuOpen(false)} />}
      {surprise && <SurpriseBox surprise={surprise} onClose={clearSurprise} />}
    </div>
  )
}

function Root() {
  const { status, me, familyId, activeChildId } = useAuth()

  if (status === 'loading') return <Splash />
  if (status === 'anon') return <Onboarding />

  // 부모 가입 직후, 아직 자녀가 없으면 자녀 추가 먼저
  if (status === 'authed' && me?.member?.role === 'parent' && (!me.children || me.children.length === 0)) {
    return <AddChildScreen />
  }

  // 부모는 자녀를 고르기 전까지 대시보드
  if (status === 'authed' && me?.member?.role === 'parent' && !activeChildId) {
    return <ParentHome />
  }

  if (!familyId || !activeChildId) return <Splash />

  return (
    <AppProvider familyId={familyId} childId={activeChildId}>
      <Shell />
    </AppProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  )
}
