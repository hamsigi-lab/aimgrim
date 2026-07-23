// aimgrim API 클라이언트. 프로덕션에선 같은 오리진의 /api/*, 로컬 풀스택은 wrangler pages dev.
import type { Snapshot, ScheduleItem } from './types'

// MVP: 데모 가족/자녀 고정. 이후 온보딩/로그인이 붙으면 실제 값으로 교체된다.
export const DEMO_FAMILY = 'fam_demo'
export const DEMO_CHILD = 'mem_child'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json() as Promise<T>
}

export function fetchSnapshot(
  familyId = DEMO_FAMILY,
  childId = DEMO_CHILD,
): Promise<Snapshot> {
  return fetch(`/api/family/${familyId}/snapshot?childId=${childId}`).then((r) => json<Snapshot>(r))
}

export interface Surprise { points: number; message: string }
export interface ToggleResult {
  done: boolean
  points: number
  gained: number
  surprise?: Surprise | null
}

export function toggleTask(taskId: string, childId = DEMO_CHILD, date?: string): Promise<ToggleResult> {
  return fetch(`/api/tasks/${taskId}/toggle`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ childId, date }),
  }).then((r) => json<ToggleResult>(r))
}

/** 특정 날짜의 하루 계획 (화살표 날짜 이동용) */
export function fetchDayTasks(
  date: string, familyId = DEMO_FAMILY, childId = DEMO_CHILD,
): Promise<{ date: string; tasks: ScheduleItem[] }> {
  return fetch(`/api/family/${familyId}/day?childId=${childId}&date=${date}`)
    .then((r) => json<{ date: string; tasks: ScheduleItem[] }>(r))
}

export interface WeekDayPlan { date: string; isToday: boolean; tasks: ScheduleItem[] }
/** 이번주(월~일) 날짜별 하루 계획 (주간 보기 인라인 입력용) */
export function fetchWeek(
  start: string, familyId = DEMO_FAMILY, childId = DEMO_CHILD,
): Promise<{ start: string; today: string; days: WeekDayPlan[] }> {
  return fetch(`/api/family/${familyId}/week?childId=${childId}&start=${start}`)
    .then((r) => json<{ start: string; today: string; days: WeekDayPlan[] }>(r))
}

function mutate<T = { ok: boolean }>(path: string, method: string, body?: unknown): Promise<T> {
  return fetch(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then((r) => json<T>(r))
}

export interface TaskInput {
  childId: string
  title: string
  category: string
  period: 'day' | 'week' | 'month'
  points: number
  timeLabel?: string
  progress?: number
  progressLabel?: string
  recur?: 'daily' | 'weekdays' | 'once' | 'days'
  /** recur='days'일 때 요일 (0=일..6=토) */
  recurDays?: number[]
  /** 하루 할일 시작일 (주간 보기에서 특정 날짜에 추가) */
  date?: string
  /** 연결할 주/월 목표 id */
  goalId?: string
  /** 목표 실천 기간 시작 (YYYY-MM-DD) */
  startDate?: string
  /** 목표 실천 기간 종료 / 하루 할일 반복 종료 (YYYY-MM-DD) */
  endDate?: string
  /** 목표 생성/수정 시 같은 이름의 '매일 실천'을 오늘 할일에 자동 추가 */
  autoDaily?: boolean
}

export const createTask = (input: TaskInput) => mutate('/api/tasks', 'POST', input)
export const updateTask = (id: string, input: Omit<TaskInput, 'childId' | 'period'>) => mutate(`/api/tasks/${id}`, 'PUT', input)
export const deleteTask = (id: string) => mutate(`/api/tasks/${id}`, 'DELETE')
export const approveTask = (id: string) => mutate(`/api/tasks/${id}/approve`, 'POST', {})
export const setTaskNote = (id: string, input: { childId: string; date: string; note: string; minutes: number }) =>
  mutate(`/api/tasks/${id}/note`, 'POST', input)
export const createEncouragement = (childId: string, message: string) => mutate('/api/encouragements', 'POST', { childId, message })
export const createRewardGoal = (input: { childId: string; title: string; emoji: string; tone: string; cost: number }) => mutate('/api/reward-goals', 'POST', input)
export const deleteRewardGoal = (id: string) => mutate(`/api/reward-goals/${id}`, 'DELETE')
export const redeemRewardGoal = (id: string) => mutate<{ ok: boolean; points: number }>(`/api/reward-goals/${id}/redeem`, 'POST', {})

export interface LedgerEntry {
  delta: number
  reason: string
  note: string | null
  createdAt: number
}
export function getLedger(childId: string): Promise<{ entries: LedgerEntry[] }> {
  return fetch(`/api/point-ledger?childId=${childId}`).then((r) => json<{ entries: LedgerEntry[] }>(r))
}

export interface ChildOverview {
  id: string
  name: string
  points: number
  todayTotal: number
  todayDone: number
  pending: number
  /** 오늘 기간 목표 수 / 오늘 체크한 목표 수 */
  goalTotal: number
  goalDone: number
  /** 오늘 순공 시간(분) */
  studyMin: number
  /** 누적 순공 목표 진행 (있을 때) */
  studyGoal: { accMin: number; targetMin: number; progress: number } | null
}
export function getOverview(familyId: string): Promise<{ children: ChildOverview[] }> {
  return fetch(`/api/family/${familyId}/overview`).then((r) => json<{ children: ChildOverview[] }>(r))
}

// ---- 가족 캘린더 ----
export type EventCategory = 'family' | 'school' | 'birthday' | 'trip' | 'etc'
export interface FamilyEvent {
  id: string
  title: string
  date: string
  timeLabel: string
  category: EventCategory
  forMember: string | null
  forName: string | null
  note: string
  authorId: string
}
export interface EventInput {
  title: string
  date: string
  timeLabel?: string
  category?: EventCategory
  forMember?: string
  note?: string
}
export function getEvents(familyId: string, month?: string): Promise<{ events: FamilyEvent[] }> {
  const q = month ? `?month=${month}` : ''
  return fetch(`/api/family/${familyId}/events${q}`).then((r) => json<{ events: FamilyEvent[] }>(r))
}
export const createEvent = (familyId: string, input: EventInput) => mutate<{ ok: boolean; id: string }>(`/api/family/${familyId}/events`, 'POST', input)
export const updateEvent = (familyId: string, id: string, input: EventInput) => mutate(`/api/family/${familyId}/events/${id}`, 'PUT', input)
export const deleteEvent = (familyId: string, id: string) => mutate(`/api/family/${familyId}/events/${id}`, 'DELETE')

// ---- 순공시간 ----
export interface Subject { id: string; name: string; color: string }
export interface StudySession { id: string; subjectId: string | null; subjectName: string; color: string; minutes: number; note: string; taskId: string | null; createdAt: number }
export interface SubjectMin { name: string; color: string; min: number }
export interface StudyDay { date: string; isToday?: boolean; totalMin: number; bySubject?: SubjectMin[] }
export interface StudyGoal {
  id: string; title: string; targetMin: number; dailyTargetMin: number | null
  startDate: string; endDate: string; accumulatedMin: number; progress: number
  daysTotal: number; daysElapsed: number; daysLeft: number
  expectedMin: number; aheadMin: number; recommendedDailyMin: number
}
export interface StudySnapshot {
  date: string
  subjects: Subject[]
  today: { totalMin: number; sessions: StudySession[] }
  week: { start: string; end: string; total: number; maxMin: number; days: StudyDay[] }
  month: { label: string; start: string; end: string; total: number; maxMin: number; days: StudyDay[] }
  streak: number
  goals: StudyGoal[]
}
export function getStudy(familyId: string, childId: string, date?: string): Promise<StudySnapshot> {
  const q = date ? `&date=${date}` : ''
  return fetch(`/api/family/${familyId}/study?childId=${childId}${q}`).then((r) => json<StudySnapshot>(r))
}
export const createSession = (input: { childId: string; subjectId?: string | null; subjectName: string; color: string; minutes: number; note?: string; taskId?: string | null; mode?: string; date?: string }) =>
  mutate<{ ok: boolean; id: string; awarded: number }>('/api/study/sessions', 'POST', input)
export const updateSession = (id: string, input: { subjectId?: string | null; subjectName: string; color: string; minutes: number; note?: string; date?: string }) =>
  mutate(`/api/study/sessions/${id}`, 'PUT', input)
export const deleteSession = (id: string) => mutate(`/api/study/sessions/${id}`, 'DELETE')
export const createSubject = (input: { childId: string; name: string; color: string }) => mutate<{ ok: boolean; id: string }>('/api/study/subjects', 'POST', input)
export const deleteSubject = (id: string) => mutate(`/api/study/subjects/${id}`, 'DELETE')
export const createStudyGoal = (input: { childId: string; title: string; targetMin: number; dailyTargetMin?: number; startDate: string; endDate: string }) => mutate<{ ok: boolean; id: string }>('/api/study/goals', 'POST', input)
export const updateStudyGoal = (id: string, input: { title: string; targetMin: number; dailyTargetMin?: number; startDate: string; endDate: string }) => mutate(`/api/study/goals/${id}`, 'PUT', input)
export const deleteStudyGoal = (id: string) => mutate(`/api/study/goals/${id}`, 'DELETE')
