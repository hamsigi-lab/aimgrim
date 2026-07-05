// 시각화용 placeholder 데이터.
// 주간 요일별 완료율/월간 히트맵은 아직 이력(완료 기록) 데이터가 없어 데모용으로 둔다.
// 이후 배치에서 point_ledger / completions 이력을 집계해 실제 데이터로 교체한다.
import type { WeekDay } from '../types'

export const weekDays: WeekDay[] = [
  { dayName: '월', dayNum: 1, completion: 100, isToday: false },
  { dayName: '화', dayNum: 2, completion: 100, isToday: false },
  { dayName: '수', dayNum: 3, completion: 60, isToday: false },
  { dayName: '목', dayNum: 4, completion: 100, isToday: false },
  { dayName: '금', dayNum: 5, completion: 40, isToday: false },
  { dayName: '토', dayNum: 6, completion: 0, isToday: true },
  { dayName: '일', dayNum: 7, completion: 0, isToday: false },
]

export const MONTH_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

interface MonthCell { day: number | null; level: number; isToday: boolean }

/** 2026년 7월: 1일이 수요일(offset 3), 31일까지. 완료 강도는 데모용 패턴. */
function buildMonthCells(): MonthCell[] {
  const cells: MonthCell[] = []
  const startOffset = 3
  for (let i = 0; i < startOffset; i++) cells.push({ day: null, level: 0, isToday: false })
  for (let d = 1; d <= 31; d++) {
    const level = d <= 18 ? (d % 4 === 0 ? 3 : d % 3 === 0 ? 2 : 1) : 0
    cells.push({ day: d, level, isToday: d === 5 })
  }
  return cells
}

export const monthCells = buildMonthCells()
