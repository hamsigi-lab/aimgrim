// 인증 API 클라이언트. 세션은 httpOnly 쿠키(same-origin)로 자동 전송된다.

export interface Me {
  authenticated: boolean
  member?: { id: string; name: string; role: 'parent' | 'child'; parentKind: 'mom' | 'dad' | null }
  family?: { id: string; name: string; inviteCode: string } | null
  children?: { id: string; name: string; birthYear: number | null; needsConsent: boolean; hasConsent: boolean }[]
}

export interface JoinInfo {
  family: { id: string; name: string }
  children: { id: string; name: string; hasPin: boolean }[]
}

class ApiError extends Error {
  constructor(public code: string, public status: number) { super(code) }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? 'error', res.status)
  return data as T
}

export function getMe(): Promise<Me> {
  return fetch('/api/me').then((r) => r.json() as Promise<Me>)
}

export function parentSignup(input: {
  email: string; password: string; name: string; parentKind: 'mom' | 'dad'; familyName: string
}): Promise<Me> {
  return post<Me>('/api/auth/parent/signup', input)
}

export function parentLogin(input: { email: string; password: string }): Promise<Me> {
  return post<Me>('/api/auth/parent/login', input)
}

/** 두 번째 부모가 초대코드로 기존 가족에 합류 */
export function parentJoin(input: {
  email: string; password: string; name: string; parentKind: 'mom' | 'dad'; inviteCode: string
}): Promise<Me> {
  return post<Me>('/api/auth/parent/join', input)
}

export interface GoogleAuthResult extends Me {
  needsFamily?: boolean
  name?: string
  email?: string
}
export function googleAuth(
  credential: string,
  opts?: { familyName?: string; parentKind?: 'mom' | 'dad'; inviteCode?: string },
): Promise<GoogleAuthResult> {
  return post<GoogleAuthResult>('/api/auth/google', { credential, ...opts })
}

export function addChild(input: {
  name: string; birthYear: number; consent: boolean; pin?: string
}): Promise<Me> {
  return post<Me>('/api/children', input)
}

/** 이미 로그인한 부모가 초대코드로 배우자 가족에 합류(이동) */
export function switchFamily(inviteCode: string): Promise<Me> {
  return post<Me>('/api/auth/family/switch', { inviteCode })
}

export function lookupInvite(code: string): Promise<JoinInfo> {
  return fetch(`/api/join/${encodeURIComponent(code)}`).then(async (r) => {
    if (!r.ok) throw new ApiError('invalid_code', r.status)
    return r.json() as Promise<JoinInfo>
  })
}

export function childLogin(input: { inviteCode: string; childId: string; pin?: string }): Promise<Me> {
  return post<Me>('/api/auth/child/login', input)
}

export function logout(): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>('/api/auth/logout', {})
}

export { ApiError }
