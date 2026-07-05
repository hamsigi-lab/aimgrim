import { monthGoal } from '../data/mock'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 2026년 7월: 1일이 수요일(offset 3), 31일까지. 완료 강도는 데모용 패턴. */
function buildCells() {
  const cells: { day: number | null; level: number; isToday: boolean }[] = []
  const startOffset = 3
  for (let i = 0; i < startOffset; i++) cells.push({ day: null, level: 0, isToday: false })
  for (let d = 1; d <= 31; d++) {
    // 오늘(5일)까지만 완료 데이터가 있다고 가정
    const level = d <= 18 ? (d % 4 === 0 ? 3 : d % 3 === 0 ? 2 : 1) : 0
    cells.push({ day: d, level, isToday: d === 5 })
  }
  return cells
}

export function MonthPanel() {
  const cells = buildCells()
  return (
    <div className="panel">
      <div className="daterow"><span className="big">이번달</span><span className="sub">7월</span></div>

      <div className="month">
        <div className="mtitle"><b>7월</b><span>완료한 날 18일 🔥</span></div>
        <div className="grid">
          {WEEKDAYS.map((w) => <div key={w} className="wd">{w}</div>)}
          {cells.map((c, i) => (
            <div
              key={i}
              className={`cell${c.level === 3 ? ' lv3' : c.level === 2 ? ' lv2' : c.level === 1 ? ' lv1' : ''}${c.isToday ? ' today' : ''}${c.day === null ? ' mut' : ''}`}
            >
              {c.day ?? ''}
            </div>
          ))}
        </div>
      </div>

      <div className="sechead"><h3>이달의 목표</h3><span className="count">1개</span></div>
      <div className="goal grape">
        <div className="lab">이달의 큰 목표</div>
        <div className="txt">{monthGoal.title} 📚</div>
        <div className="bar"><i style={{ width: `${monthGoal.progress}%` }} /></div>
        <div className="pct">{monthGoal.progressLabel}</div>
        <svg className="blob" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="48" fill="rgba(255,255,255,.18)" />
        </svg>
      </div>
    </div>
  )
}
