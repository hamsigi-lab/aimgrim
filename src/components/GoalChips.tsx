import type { ScheduleItem } from '../types'

/** 계획 뷰 상단의 '목표 요약' 한 줄 (읽기용, 탭하면 목표 탭으로) */
export function GoalChips({ label, goals, onOpen }: { label: string; goals: ScheduleItem[]; onOpen?: () => void }) {
  if (goals.length === 0) return null
  return (
    <button type="button" className="wg-mini" onClick={onOpen}>
      <span className="wg-lab">🎯 {label} {goals.length} <span className="wg-more">관리 ›</span></span>
      <span className="wg-strip">
        {goals.map((g) => (
          <span className="wg-pill" key={g.id}>
            <span className={`wg-dot ${g.category}`} aria-hidden="true" />
            <span className="wg-name">{g.title}</span>
            <span className="wg-pct">{g.progress}%</span>
          </span>
        ))}
      </span>
    </button>
  )
}
