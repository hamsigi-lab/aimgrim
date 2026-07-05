import { useApp } from '../state/store'
import { weekDays } from '../data/viz'
import type { ScheduleItem } from '../types'

function ProgressRing({ pct, isToday }: { pct: number; isToday: boolean }) {
  const r = 8
  const circ = 2 * Math.PI * r
  const off = circ * (1 - pct / 100)
  const track = isToday ? 'rgba(255,255,255,.4)' : '#E4EEEA'
  const fill = isToday ? '#fff' : '#2FB79A'
  return (
    <svg className="ring" viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="11" cy="11" r={r} fill="none" stroke={track} strokeWidth="3" />
      <circle
        cx="11" cy="11" r={r} fill="none" stroke={fill} strokeWidth="3" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={off} transform="rotate(-90 11 11)"
      />
    </svg>
  )
}

const AUTHOR_LABEL: Record<ScheduleItem['author'], string> = { me: '내가', mom: '엄마가', dad: '아빠가' }

/** 주간/월간 목표는 진행 상태만 보여주는 읽기전용 행 */
function GoalRow({ goal }: { goal: ScheduleItem }) {
  const done = goal.progress >= 100
  return (
    <div className={`task readonly${done ? ' done' : ''}`}>
      <span className={`cat ${goal.category}`} aria-hidden="true" />
      <span className="check">
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M4 10.5l4 4 8-9" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="tmid">
        <span className="t">{goal.title}</span>
        <span className="tmeta">
          <span className={`who ${goal.author}`}>{AUTHOR_LABEL[goal.author]}</span>
          <span className="time">{goal.progressLabel}</span>
        </span>
      </span>
      <span className="pts">+{goal.points} ⭐</span>
    </div>
  )
}

export function WeekPanel() {
  const { snapshot } = useApp()
  if (!snapshot) return null
  const cheer = snapshot.encouragements.find((e) => e.from === 'mom')

  return (
    <div className="panel">
      <div className="daterow"><span className="big">이번주</span><span className="sub">7월 1일 – 7일</span></div>

      <div className="weekstrip">
        {weekDays.map((d) => (
          <div key={d.dayNum} className={`day${d.isToday ? ' today' : ''}`}>
            <div className="dn">{d.dayName}</div>
            <div className="dd">{d.dayNum}</div>
            <ProgressRing pct={d.completion} isToday={d.isToday} />
          </div>
        ))}
      </div>

      <div className="sechead"><h3>주간 목표</h3><span className="count">{snapshot.weekGoals.length}개</span></div>
      {snapshot.weekGoals.map((g) => <GoalRow key={g.id} goal={g} />)}

      {cheer && (
        <div className="cheer-card">
          <div className="from">💜 엄마의 응원</div>
          <div className="msg">{cheer.message}</div>
        </div>
      )}
    </div>
  )
}
