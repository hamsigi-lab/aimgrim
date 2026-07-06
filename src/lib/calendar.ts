// 스냅샷의 기준 날짜(anchor, 'YYYY-MM-DD')로부터 실제 날짜 라벨/주간/월간 구조를 만든다.
// 날짜는 표시용 라벨이므로 UTC로 계산해 타임존 드리프트를 피한다.
import type { DayHistory } from '../types'

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

export function parseISO(iso: string): Date {
  return new Date(iso + 'T00:00:00Z')
}
function isoOf(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function todayLabel(iso: string): { big: string; sub: string } {
  const d = parseISO(iso)
  return {
    big: `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`,
    sub: `${WEEKDAY[d.getUTCDay()]}요일 · 오늘`,
  }
}

/** 날짜를 delta일만큼 이동한 ISO 문자열 */
export function shiftISO(iso: string, delta: number): string {
  const d = parseISO(iso)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

/** 보는 날짜 헤더 라벨 (오늘 기준 상대 표기) */
export function dateHeader(iso: string, todayISO: string): { big: string; sub: string } {
  const d = parseISO(iso)
  const diff = Math.round((parseISO(iso).getTime() - parseISO(todayISO).getTime()) / 86_400_000)
  const rel = diff === 0 ? '오늘' : diff === -1 ? '어제' : diff === 1 ? '내일'
    : diff < 0 ? `${-diff}일 전` : `${diff}일 후`
  return {
    big: `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`,
    sub: `${WEEKDAY[d.getUTCDay()]}요일 · ${rel}`,
  }
}

export interface WeekDayCell {
  date: string
  dayNum: number
  dayName: string
  isToday: boolean
  completion: number // 0–100
}

/** 월~일 기준 이번 주 */
export function weekInfo(iso: string, history: DayHistory[], dayTaskCount: number): { label: string; days: WeekDayCell[] } {
  const anchor = parseISO(iso)
  const dow = anchor.getUTCDay() // 0=일..6=토
  const mondayOffset = (dow + 6) % 7
  const monday = new Date(anchor)
  monday.setUTCDate(anchor.getUTCDate() - mondayOffset)

  const doneByDate = new Map(history.map((h) => [h.date, h.done]))
  const days: WeekDayCell[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setUTCDate(monday.getUTCDate() + i)
    const ds = isoOf(d)
    const done = doneByDate.get(ds) ?? 0
    days.push({
      date: ds,
      dayNum: d.getUTCDate(),
      dayName: WEEKDAY[d.getUTCDay()],
      isToday: ds === iso,
      completion: dayTaskCount > 0 ? Math.min(100, Math.round((done / dayTaskCount) * 100)) : 0,
    })
  }
  const sunday = new Date(monday); sunday.setUTCDate(monday.getUTCDate() + 6)
  const label = `${monday.getUTCMonth() + 1}월 ${monday.getUTCDate()}일 – ${sunday.getUTCMonth() + 1 === monday.getUTCMonth() + 1 ? '' : `${sunday.getUTCMonth() + 1}월 `}${sunday.getUTCDate()}일`
  return { label, days }
}

export interface MonthCell {
  day: number | null
  level: number // 0–3
  isToday: boolean
}

export function monthInfo(iso: string, history: DayHistory[], dayTaskCount: number): { label: string; cells: MonthCell[]; doneDays: number } {
  const anchor = parseISO(iso)
  const year = anchor.getUTCFullYear()
  const month = anchor.getUTCMonth() // 0-based
  const first = new Date(Date.UTC(year, month, 1))
  const startOffset = first.getUTCDay() // 일요일 시작 그리드
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

  const doneByDate = new Map(history.map((h) => [h.date, h.done]))
  const cells: MonthCell[] = []
  for (let i = 0; i < startOffset; i++) cells.push({ day: null, level: 0, isToday: false })
  let doneDays = 0
  for (let day = 1; day <= daysInMonth; day++) {
    const ds = isoOf(new Date(Date.UTC(year, month, day)))
    const done = doneByDate.get(ds) ?? 0
    if (done > 0) doneDays++
    const ratio = dayTaskCount > 0 ? done / dayTaskCount : 0
    const level = done === 0 ? 0 : ratio >= 1 ? 3 : ratio >= 0.5 ? 2 : 1
    cells.push({ day, level, isToday: ds === iso })
  }
  return { label: `${month + 1}월`, cells, doneDays }
}
