import type { GoalItem, ScheduleItem } from '../types'
import { TaskRow } from './TaskRow'

interface Props {
  tasks: ScheduleItem[]
  goals: GoalItem[]
  onToggle?: (id: string) => void
  onEdit?: (task: ScheduleItem) => void
  canApprove?: boolean
  onApprove?: (id: string) => void
}

/** 계획(오늘/주) 리스트 — 할일을 상위 목표별로 묶어 보여준다.
 *  목표 헤더의 진행바가 그 목표의 실천을 해낼수록 눈앞에서 채워진다(롤업 시각화).
 *  목표가 2개 미만이면 굳이 나누지 않고 평면 리스트 + 목표 꼬리표로 표시. */
export function PlanList({ tasks, goals, onToggle, onEdit, canApprove, onApprove }: Props) {
  const goalsById = new Map(goals.map((g) => [g.id, g]))
  const linkedIds = new Set(tasks.map((t) => t.goalId).filter((id): id is string => !!id && goalsById.has(id)))
  const grouped = linkedIds.size >= 2

  const row = (t: ScheduleItem, withChip: boolean) => {
    const g = withChip && t.goalId ? goalsById.get(t.goalId) : undefined
    return (
      <TaskRow key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} canApprove={canApprove} onApprove={onApprove}
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
