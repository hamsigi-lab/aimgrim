// aimgrim API 클라이언트. 프로덕션에선 같은 오리진의 /api/*, 로컬 풀스택은 wrangler pages dev.
import type { Snapshot } from './types'

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

export interface ToggleResult {
  done: boolean
  points: number
  gained: number
}

export function toggleTask(taskId: string, childId = DEMO_CHILD): Promise<ToggleResult> {
  return fetch(`/api/tasks/${taskId}/toggle`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ childId }),
  }).then((r) => json<ToggleResult>(r))
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
  recur?: 'daily' | 'weekdays' | 'once'
}

export const createTask = (input: TaskInput) => mutate('/api/tasks', 'POST', input)
export const updateTask = (id: string, input: Omit<TaskInput, 'childId' | 'period'>) => mutate(`/api/tasks/${id}`, 'PUT', input)
export const deleteTask = (id: string) => mutate(`/api/tasks/${id}`, 'DELETE')
export const approveTask = (id: string) => mutate(`/api/tasks/${id}/approve`, 'POST', {})
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
