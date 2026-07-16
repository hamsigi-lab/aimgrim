import type { ScheduleItem, Author, Category } from '../types'

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
  /** 완료 항목에 '무엇을 했는지' 기록 열기 */
  onNote?: (task: ScheduleItem) => void
  /** 소속 목표 꼬리표 (목표별 그룹핑을 하지 않는 평면 리스트에서 연결감 표시) */
  goalLabel?: { title: string; category: Category }
}

export function TaskRow({ task, onToggle, onEdit, onApprove, canApprove, onNote, goalLabel }: Props) {
  const interactive = !!onToggle
  const showApprove = canApprove && task.done && !task.approved
  const showApproved = task.done && task.approved
  const showNote = !!onNote && task.done
  const hasSide = !!onEdit || showApprove || showNote

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
          {goalLabel && <span className={`goal-chip ${goalLabel.category}`}>🎯 {goalLabel.title}</span>}
          {task.timeLabel && <span className="time">{task.timeLabel}</span>}
          {typeof task.minutes === 'number' && task.minutes > 0 && <span className="min-chip">⏱ {task.minutes}분</span>}
          {showApproved && <span className="approved-tag">💛 확인됨</span>}
        </span>
        {task.note && <span className="tasknote">📝 {task.note}</span>}
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
        {showNote && <button type="button" className="note-handle" aria-label="공부 기록" title="무엇을 했는지 기록" onClick={() => onNote!(task)}>📝</button>}
        {onEdit && <button type="button" className="edit-handle" aria-label="고치기" onClick={() => onEdit(task)}>✎</button>}
      </div>
    </div>
  )
}
