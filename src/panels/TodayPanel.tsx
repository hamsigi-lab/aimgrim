import { useApp } from '../state/store'
import { TaskRow } from '../components/TaskRow'

export function TodayPanel() {
  const { snapshot, toggleTask, doneCount, todayTotal } = useApp()
  if (!snapshot) return null
  const hero = snapshot.weekGoals[0]

  return (
    <div className="panel">
      <div className="daterow"><span className="big">7월 5일</span><span className="sub">토요일 · 오늘</span></div>

      {hero && (
        <div className="goal">
          <div className="lab">이번주 목표</div>
          <div className="txt">{hero.title} 💪</div>
          <div className="bar"><i style={{ width: `${hero.progress}%` }} /></div>
          <div className="pct">{hero.progress}% · 조금만 더!</div>
          <svg className="blob" viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="48" fill="rgba(255,255,255,.18)" />
            <circle cx="60" cy="60" r="30" fill="rgba(255,255,255,.16)" />
          </svg>
        </div>
      )}

      <div className="approve">
        <span className="ai" aria-hidden="true">🧡</span>
        <span className="atx">엄마가 오늘 할일을 확인하고 응원했어요</span>
        <button type="button" className="abtn">보기</button>
      </div>

      <div className="sechead">
        <h3>오늘 할일</h3>
        <span className="count">{doneCount} / {todayTotal} 완료</span>
      </div>

      {snapshot.todayTasks.map((t) => <TaskRow key={t.id} task={t} onToggle={toggleTask} />)}
    </div>
  )
}
