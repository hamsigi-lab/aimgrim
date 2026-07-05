import { useEffect, useRef, useState } from 'react'
import { AppProvider, useApp } from './state/store'
import { TodayPanel } from './panels/TodayPanel'
import { WeekPanel } from './panels/WeekPanel'
import { MonthPanel } from './panels/MonthPanel'
import { PointsPanel } from './panels/PointsPanel'
import { childName } from './data/mock'

type Tab = 'today' | 'week' | 'month' | 'points'

const NAV: { id: Tab; icon: string; label: string }[] = [
  { id: 'today', icon: '🏠', label: '오늘' },
  { id: 'week', icon: '📅', label: '이번주' },
  { id: 'month', icon: '🗓️', label: '이번달' },
  { id: 'points', icon: '⭐', label: '별점' },
]

function Shell() {
  const { points, celebrateTick, lastGain } = useApp()
  const [tab, setTab] = useState<Tab>('today')
  const [bump, setBump] = useState(false)
  const [floatKey, setFloatKey] = useState(0)
  const [celebrating, setCelebrating] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  // 별점 획득 시 연출: 포인트 pill 튕김 + 떠오르는 +점 + 마스코트 반응
  useEffect(() => {
    if (celebrateTick === 0) return
    setBump(true)
    setFloatKey((k) => k + 1)
    setCelebrating(true)
    const t1 = window.setTimeout(() => setBump(false), 520)
    const t2 = window.setTimeout(() => setCelebrating(false), 700)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
  }, [celebrateTick])

  function go(next: Tab) {
    setTab(next)
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }

  return (
    <div className="app">
      <header className="appbar">
        <div className="hi">
          <div className="greet">안녕, 오늘도 반가워 👋</div>
          <div className="name">{childName}의 하루</div>
        </div>
        <div className={`points${bump ? ' bump' : ''}`} aria-label={`모은 별점 ${points}점`}>
          <span className="star" aria-hidden="true">⭐</span><b>{points}</b>
        </div>
      </header>

      <main className="body" ref={bodyRef}>
        {floatKey > 0 && (
          <div className="float go" key={floatKey} aria-hidden="true">+{lastGain}</div>
        )}
        {tab === 'today' && <TodayPanel />}
        {tab === 'week' && <WeekPanel />}
        {tab === 'month' && <MonthPanel />}
        {tab === 'points' && <PointsPanel celebrating={celebrating} />}
      </main>

      <nav className="nav" aria-label="화면 이동">
        {NAV.map((n) => (
          <button
            key={n.id}
            type="button"
            className={tab === n.id ? 'on' : ''}
            aria-current={tab === n.id ? 'page' : undefined}
            onClick={() => go(n.id)}
          >
            <span className="ni" aria-hidden="true">{n.icon}</span>
            <span className="nl">{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
