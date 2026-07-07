import type { ScheduleItem } from '../types'

const AUTHOR_LABEL: Record<ScheduleItem['author'], string> = { me: '내가', mom: '엄마가', dad: '아빠가' }

/** 주/월 목표 행 — 진행률 바 + 우측 아이콘 액션(담기·고치기·삭제) */
export function GoalRow({ goal, onEdit, onCascade, onDelete }: {
  goal: ScheduleItem
  onEdit?: (g: ScheduleItem) => void
  onCascade?: (g: ScheduleItem) => void
  onDelete?: (g: ScheduleItem) => void
}) {
  const done = goal.progress >= 100
  const label = goal.autoProgress ? `${goal.progress}% · 자동` : (goal.progressLabel || `${goal.progress}%`)
  return (
    <div className={`task readonly goal-card${done ? ' done' : ''}`}>
      <span className={`cat ${goal.category}`} aria-hidden="true" />
      <span className="tmid">
        <span className="t">{goal.title}</span>
        <span className="tmeta">
          <span className={`who ${goal.author}`}>{AUTHOR_LABEL[goal.author]}</span>
          <span className="time">{label}</span>
        </span>
        <span className="goal-bar"><i style={{ width: `${goal.progress}%` }} /></span>
      </span>
      <span className="goal-icons">
        {onCascade && <button type="button" className="gi-btn cascade" title="하루계획에 담기" aria-label="하루계획에 담기" onClick={() => onCascade(goal)}>＋</button>}
        {onEdit && <button type="button" className="gi-btn" title="고치기" aria-label="고치기" onClick={() => onEdit(goal)}>✎</button>}
        {onDelete && <button type="button" className="gi-btn del" title="삭제" aria-label="삭제" onClick={() => onDelete(goal)}>🗑</button>}
      </span>
    </div>
  )
}
