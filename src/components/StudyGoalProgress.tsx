import type { StudyGoal } from '../api'

function h(min: number): string {
  const v = Math.round((min / 60) * 10) / 10
  return `${v}시간`
}

/** 순공 기간 누적목표 진행 — 누적 진행바 + D-day + 격려형 페이스 + 하루 목표.
 *  뒤처짐은 질책 없이 '하루 X시간이면 도착' 캐치업으로 프레이밍. */
export function StudyGoalProgress({ goal, todayMin, onEdit, mini }: {
  goal: StudyGoal
  todayMin: number
  onEdit?: () => void
  mini?: boolean
}) {
  const recH = Math.round((goal.recommendedDailyMin / 60) * 10) / 10
  const paceText = goal.daysLeft < 0
    ? '기간이 끝났어요 · 정말 수고했어요'
    : goal.aheadMin >= 0
      ? (goal.aheadMin < 30 ? '딱 맞게 가고 있어요 👍' : `예상보다 ${h(goal.aheadMin)} 앞서요! 🎉`)
      : `하루 ${recH}시간이면 목표에 도착해요 💪`
  const dDay = goal.daysLeft >= 0 ? `D-${goal.daysLeft}` : '완료'

  if (mini) {
    return (
      <div className="sg-mini">
        <div className="sgm-top"><span className="sgm-title">🎯 {goal.title}</span><span className="sgm-num">{h(goal.accumulatedMin)} / {h(goal.targetMin)} · {dDay}</span></div>
        <div className="sg-bar"><span className="sg-fill" style={{ width: `${goal.progress}%` }} /></div>
      </div>
    )
  }

  return (
    <div className="sg-card">
      <div className="sg-head">
        <span className="sg-title">🎯 {goal.title}</span>
        <span className="sg-dday">{dDay}</span>
        {onEdit && <button type="button" className="sg-edit" aria-label="목표 고치기" onClick={onEdit}>✎</button>}
      </div>
      <div className="sg-big"><b>{h(goal.accumulatedMin)}</b> <span>/ {h(goal.targetMin)}</span><span className="sg-pct">{goal.progress}%</span></div>
      <div className="sg-bar big"><span className="sg-fill" style={{ width: `${goal.progress}%` }} /></div>
      <div className="sg-pace">{paceText}</div>
      {goal.dailyTargetMin != null && (
        <div className="sg-daily">
          <span className="sgd-lab">오늘 {h(todayMin)} / {h(goal.dailyTargetMin)}</span>
          <div className="sg-bar"><span className="sg-fill" style={{ width: `${Math.min(100, Math.round((todayMin / goal.dailyTargetMin) * 100))}%` }} /></div>
        </div>
      )}
    </div>
  )
}
