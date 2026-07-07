import { useApp } from '../state/store'
import { GoalChips } from '../components/GoalChips'
import { monthInfo } from '../lib/calendar'

const MONTH_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function MonthPanel({ onOpenDay, onGoToGoals }: { onOpenDay?: () => void; onGoToGoals?: () => void }) {
  const { snapshot } = useApp()
  if (!snapshot) return null
  const goal = snapshot.monthGoal
  const month = monthInfo(snapshot.today, snapshot.history, snapshot.dayTaskCount)

  return (
    <div className="panel">
      <div className="daterow"><span className="big">이번달</span><span className="sub">{month.label}</span></div>

      <GoalChips label="이달의 목표" goals={goal ? [goal] : []} onOpen={onGoToGoals} />

      <div className="month">
        <div className="mtitle"><b>{month.label}</b><span>{month.doneDays > 0 ? `완료한 날 ${month.doneDays}일 🔥` : '이번달 첫 기록을 만들어봐요'}</span></div>
        <div className="grid">
          {MONTH_WEEKDAYS.map((w) => <div key={w} className="wd">{w}</div>)}
          {month.cells.map((c, i) => (
            <button key={i} type="button" disabled={c.day === null} onClick={c.day ? onOpenDay : undefined}
              className={`cell${c.level === 3 ? ' lv3' : c.level === 2 ? ' lv2' : c.level === 1 ? ' lv1' : ''}${c.isToday ? ' today' : ''}${c.day === null ? ' mut' : ''}`}>
              {c.day ?? ''}
            </button>
          ))}
        </div>
      </div>

      <p className="empty-hint" style={{ paddingTop: 4 }}>날짜를 눌러 그 날의 계획을 보고 짜 보세요.</p>
    </div>
  )
}
