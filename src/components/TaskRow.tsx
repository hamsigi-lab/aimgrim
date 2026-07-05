import type { ScheduleItem, Author } from '../types'

const AUTHOR_LABEL: Record<Author, string> = { me: '내가', mom: '엄마가', dad: '아빠가' }

function CheckMark() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10.5l4 4 8-9" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface Props {
  task: ScheduleItem
  onToggle?: (id: string) => void
  onEdit?: (task: ScheduleItem) => void
  onApprove?: (id: string) => void
  canApprove?: boolean
}

export function TaskRow({ task, onToggle, onEdit, onApprove, canApprove }: Props) {
  const interactive = !!onToggle
  const showApprove = canApprove && task.done && !task.approved
  const showApproved = task.done && task.approved
  const hasSide = !!onEdit || showApprove

  const row = (
    <button
      type="button"
      className={`task${task.done ? ' done' : ''}${interactive ? '' : ' readonly'}`}
      onClick={interactive ? () => onToggle!(task.id) : undefined}
      aria-pressed={interactive ? task.done : undefined}
      aria-label={`${task.title}, ${task.points}점${task.done ? ', 완료됨' : ''}`}
    >
      <span className={`cat ${task.category}`} aria-hidden="true" />
      <span className="check"><CheckMark /></span>
      <span className="tmid">
        <span className="t">{task.title}</span>
        <span className="tmeta">
          <span className={`who ${task.author}`}>{AUTHOR_LABEL[task.author]}</span>
          {task.timeLabel && <span className="time">{task.timeLabel}</span>}
          {showApproved && <span className="approved-tag">💛 확인됨</span>}
        </span>
      </span>
      <span className="pts">+{task.points} ⭐</span>
    </button>
  )

  if (!hasSide) return row

  return (
    <div className="task-wrap">
      {row}
      <div className="task-side">
        {showApprove && <button type="button" className="approve-chip" onClick={() => onApprove!(task.id)}>💛 확인</button>}
        {onEdit && <button type="button" className="edit-handle" aria-label="고치기" onClick={() => onEdit(task)}>✎</button>}
      </div>
    </div>
  )
}
