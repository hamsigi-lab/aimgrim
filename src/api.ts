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
