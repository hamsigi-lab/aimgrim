import { useApp } from '../state/store'
import { monthCells, MONTH_WEEKDAYS } from '../data/viz'

export function MonthPanel() {
  const { snapshot } = useApp()
  if (!snapshot) return null
  const goal = snapshot.monthGoal

  return (
    <div className="panel">
      <div className="daterow"><span className="big">이번달</span><span className="sub">7월</span></div>

      <div className="month">
        <div className="mtitle"><b>7월</b><span>완료한 날 18일 🔥</span></div>
        <div className="grid">
          {MONTH_WEEKDAYS.map((w) => <div key={w} className="wd">{w}</div>)}
          {monthCells.map((c, i) => (
            <div
              key={i}
              className={`cell${c.level === 3 ? ' lv3' : c.level === 2 ? ' lv2' : c.level === 1 ? ' lv1' : ''}${c.isToday ? ' today' : ''}${c.day === null ? ' mut' : ''}`}
            >
              {c.day ?? ''}
            </div>
          ))}
        </div>
      </div>

      {goal && (
        <>
          <div className="sechead"><h3>이달의 목표</h3><span className="count">1개</span></div>
          <div className="goal grape">
            <div className="lab">이달의 큰 목표</div>
            <div className="txt">{goal.title} 📚</div>
            <div className="bar"><i style={{ width: `${goal.progress}%` }} /></div>
            <div className="pct">{goal.progressLabel}</div>
            <svg className="blob" viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="48" fill="rgba(255,255,255,.18)" />
            </svg>
          </div>
        </>
      )}
    </div>
  )
}
