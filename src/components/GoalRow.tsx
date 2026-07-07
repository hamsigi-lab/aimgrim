import type { ScheduleItem } from '../types'

const AUTHOR_LABEL: Record<ScheduleItem['author'], string> = { me: '내가', mom: '엄마가', dad: '아빠가' }

/** 주/월 목표 행 — 진행률(자동/수동) 바 + 편집 + 하루계획 담기 */
export function GoalRow({ goal, onEdit, onCascade }: {
  goal: ScheduleItem; onEdit?: (g: ScheduleItem) => void; onCascade?: (g: ScheduleItem) => void
}) {
  const done = goal.progress >= 100
  const label = goal.autoProgress ? `${goal.progress}% · 자동` : (goal.progressLabel || `${goal.progress}%`)
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
        {onEdit && <button type="button" className="edit-handle" aria-label="고치기" onClick={() => onEdit(goal)}>✎</button>}
      </div>
      {onCascade && (
        <button type="button" className="goal-cascade" onClick={() => onCascade(goal)}>＋ 이 목표를 하루계획에 담기</button>
      )}
    </div>
  )
}
