import type { Task, Author } from '../types'

const AUTHOR_LABEL: Record<Author, string> = { me: '내가', mom: '엄마가', dad: '아빠가' }

function CheckMark() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10.5l4 4 8-9" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function TaskRow({ task, onToggle }: { task: Task; onToggle?: (id: string) => void }) {
  const interactive = !!onToggle
  return (
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
          <span className="time">{task.timeLabel}</span>
        </span>
      </span>
      <span className="pts">+{task.points} ⭐</span>
    </button>
  )
}
