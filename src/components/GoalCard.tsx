import type { GoalItem, ScheduleItem } from '../types'
import { GrimiJourney } from './GrimiJourney'

const AUTHOR_LABEL: Record<ScheduleItem['author'], string> = { me: '내가', mom: '엄마가', dad: '아빠가' }
const WD = ['일', '월', '화', '수', '목', '금', '토']

function recurLabel(sp: ScheduleItem): string {
  if (sp.recur === 'weekdays') return '평일'
  if (sp.recur === 'once') return '한 번'
  if (sp.recur === 'days') return sp.recurDays.map((d) => WD[d]).join('·') || '요일'
  return '매일'
}
const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`
function dDayLabel(d: number): string { return d > 0 ? `D-${d}` : d === 0 ? '오늘까지' : '기간 지남' }

/** 목표 카드 — 여정(목적지) + 그 아래 하위 계획(매일 실천)을 중첩해 담는다.
 *  하위 실천을 해낼수록 위 여정이 채워진다(진행률 자동 롤업). */
export function GoalCard({ goal, canManage, onEditGoal, onDeleteGoal, onAddSub, onEditSub }: {
  goal: GoalItem
  canManage: boolean
  onEditGoal?: (g: GoalItem) => void
  onDeleteGoal?: (g: GoalItem) => void
  onAddSub?: (g: GoalItem) => void
  onEditSub?: (g: GoalItem, sp: ScheduleItem) => void
}) {
  const subs = goal.subplans
  return (
    <div className="goal-item">
      <div className="goal-head">
        <span className={`cat ${goal.category}`} aria-hidden="true" />
        <span className="tmid">
          <span className="t">{goal.title}</span>
          <span className="tmeta">
            <span className={`who ${goal.author}`}>{AUTHOR_LABEL[goal.author]}</span>
            {goal.endDate
              ? <span className="period-tag">{goal.startDate ? `${md(goal.startDate)}~` : ''}{md(goal.endDate)}{typeof goal.dDay === 'number' ? ` · ${dDayLabel(goal.dDay)}` : ''}</span>
              : <span className="period-tag">{goal.period === 'week' ? '주간' : '월간'}</span>}
            {goal.autoProgress && <span className="auto-tag">자동</span>}
          </span>
        </span>
        {canManage && (
          <span className="goal-icons">
            {onEditGoal && <button type="button" className="gi-btn" title="목표 고치기" aria-label="목표 고치기" onClick={() => onEditGoal(goal)}>✎</button>}
            {onDeleteGoal && <button type="button" className="gi-btn del" title="삭제" aria-label="삭제" onClick={() => onDeleteGoal(goal)}>🗑</button>}
          </span>
        )}
      </div>

      <GrimiJourney progress={goal.progress} category={goal.category} />

      <div className="subplans">
        <div className="sp-head">
          <span className="sp-title">이 목표를 위한 실천</span>
          <span className="sp-count">{subs.length}개</span>
        </div>
        {subs.map((sp) => (
          <div key={sp.id} className={`subplan${sp.done ? ' done' : ''}`}>
            <span className={`cat ${sp.category}`} aria-hidden="true" />
            <span className="sp-dot" aria-hidden="true">{sp.done ? '✓' : '·'}</span>
            <span className="sp-mid">
              <span className="sp-t">{sp.title}</span>
              <span className="sp-meta">{recurLabel(sp)} · +{sp.points}⭐</span>
            </span>
            {canManage && onEditSub && (
              <button type="button" className="sp-edit" aria-label="실천 고치기" onClick={() => onEditSub(goal, sp)}>✎</button>
            )}
          </div>
        ))}
        {subs.length === 0 && (
          <p className="sp-empty">아직 실천이 없어요. 이 목표를 이룰 하루 실천을 더해요 🌱</p>
        )}
        {canManage && onAddSub && (
          <button type="button" className="sp-add" onClick={() => onAddSub(goal)}>＋ 이 목표를 위한 실천 추가</button>
        )}
      </div>
    </div>
  )
}
