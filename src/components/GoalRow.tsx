import type { ScheduleItem } from '../types'

const AUTHOR_LABEL: Record<ScheduleItem['author'], string> = { me: '내가', mom: '엄마가', dad: '아빠가' }

/** 주/월 목표 행 — 진행률 바 + 컴팩트 액션(담기·고치기·삭제) 한 줄 */
export function GoalRow({ goal, onEdit, onCascade, onDelete }: {
  goal: ScheduleItem
  onEdit?: (g: ScheduleItem) => void
  onCascade?: (g: ScheduleItem) => void
  onDelete?: (g: ScheduleItem) => void
}) {
  const done = goal.progress >= 100
  const label = goal.autoProgress ? `${goal.progress}% · 자동` : (goal.progressLabel || `${goal.progress}%`)
  const hasActions = onEdit || onCascade || onDelete
  return (
    <div className="goal-item">
      <div className={`task readonly${done ? ' done' : ''}`} style={{ marginBottom: 0 }}>
        <span className={`cat ${goal.category}`} aria-hidden="true" />
        <span className="check">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10.5l4 4 8-9" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <span className="tmid">
          <span className="t">{goal.title}</span>
          <span className="tmeta">
            <span className={`who ${goal.author}`}>{AUTHOR_LABEL[goal.author]}</span>
            <span className="time">{label}</span>
          </span>
          <span className="goal-bar"><i style={{ width: `${goal.progress}%` }} /></span>
        </span>
      </div>
      {hasActions && (
        <div className="goal-actions">
          {onCascade && <button type="button" className="ga-btn cascade" onClick={() => onCascade(goal)}>＋ 하루계획 담기</button>}
          {onEdit && <button type="button" className="ga-btn" onClick={() => onEdit(goal)}>✎ 고치기</button>}
          {onDelete && <button type="button" className="ga-btn del" onClick={() => onDelete(goal)}>🗑 삭제</button>}
        </div>
      )}
    </div>
  )
}
