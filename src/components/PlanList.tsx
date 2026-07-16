import type { GoalItem, ScheduleItem } from '../types'
import { TaskRow } from './TaskRow'

interface Props {
  tasks: ScheduleItem[]
  goals: GoalItem[]
  onToggle?: (id: string) => void
  onEdit?: (task: ScheduleItem) => void
  onNote?: (task: ScheduleItem) => void
  canApprove?: boolean
  onApprove?: (id: string) => void
  /** 오늘 화면: 목표 그룹핑 없이 평면 + 목표 꼬리표로만 (오늘 할일 부각) */
  forceFlat?: boolean
}

/** 계획 리스트 — 오늘 뷰는 평면(목표는 색·꼬리표로만)로 할일을 부각하고,
 *  주 뷰는 목표별로 묶어 진행바 롤업(실천할수록 채워짐)을 보여준다. */
export function PlanList({ tasks, goals, onToggle, onEdit, onNote, canApprove, onApprove, forceFlat }: Props) {
  const goalsById = new Map(goals.map((g) => [g.id, g]))
  const linkedIds = new Set(tasks.map((t) => t.goalId).filter((id): id is string => !!id && goalsById.has(id)))
  const grouped = !forceFlat && linkedIds.size >= 2

  const row = (t: ScheduleItem, withChip: boolean) => {
    const g = withChip && t.goalId ? goalsById.get(t.goalId) : undefined
    return (
      <TaskRow key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} onNote={onNote} canApprove={canApprove} onApprove={onApprove}
        goalLabel={g ? { title: g.title, category: g.category } : undefined} />
    )
  }

  if (!grouped) return <>{tasks.map((t) => row(t, true))}</>

  const leftover = tasks.filter((t) => !t.goalId || !goalsById.has(t.goalId))
  return (
    <>
      {goals.map((g) => {
        const gt = tasks.filter((t) => t.goalId === g.id)
        if (gt.length === 0) return null
        const doneN = gt.filter((t) => t.done).length
        return (
          <div key={g.id} className="pgrp">
            <div className="pgrp-head">
              <span className={`pg-dot ${g.category}`} aria-hidden="true" />
              <span className="pg-name">{g.title}</span>
              <span className="pg-count">{doneN}/{gt.length}</span>
              <span className="pg-pct">{g.progress}%</span>
            </div>
            <div className="pg-bar"><span className="pg-fill" style={{ width: `${g.progress}%` }} /></div>
            <div className="pg-tasks">{gt.map((t) => row(t, false))}</div>
          </div>
        )
      })}
      {leftover.length > 0 && (
        <div className="pgrp">
          <div className="pgrp-head"><span className="pg-dot etc" aria-hidden="true" /><span className="pg-name">그 밖의 할일</span><span className="pg-count">{leftover.filter((t) => t.done).length}/{leftover.length}</span></div>
          <div className="pg-tasks">{leftover.map((t) => row(t, false))}</div>
        </div>
      )}
    </>
  )
}
