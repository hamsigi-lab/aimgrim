import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react'
import { getMe, logout as apiLogout, type Me } from './api'

export type AuthStatus = 'loading' | 'anon' | 'authed' | 'demo'

interface AuthState {
  status: AuthStatus
  me: Me | null
  /** 현재 보고 있는 자녀 id (자녀 로그인 시 본인, 부모는 선택) */
  activeChildId: string | null
  /** 현재 가족 id */
  familyId: string | null
  setMe: (me: Me) => void
  setActiveChild: (childId: string) => void
  /** 부모가 자녀 화면에서 대시보드로 돌아가기 */
  exitToHome: () => void
  enterDemo: () => void
  exitDemo: () => void
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

function pickChild(me: Me): string | null {
  // 자녀는 본인 화면으로, 부모는 대시보드(null)에서 시작해 자녀를 고른다
  if (me.member?.role === 'child') return me.member.id
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [me, setMeState] = useState<Me | null>(null)
  const [activeChildId, setActiveChildId] = useState<string | null>(null)

  const applyMe = useCallback((next: Me) => {
    setMeState(next)
    if (next.authenticated) {
      setStatus('authed')
      setActiveChildId((prev) => prev ?? pickChild(next))
    } else {
      setStatus('anon')
    }
  }, [])

  const refresh = useCallback(async () => {
    const next = await getMe()
    applyMe(next)
  }, [applyMe])

  useEffect(() => {
    getMe().then(applyMe).catch(() => setStatus('anon'))
  }, [applyMe])

  const setMe = useCallback((next: Me) => {
    // 새 자녀 추가 등으로 me가 바뀌면 activeChild 재선택
    setMeState(next)
    setStatus(next.authenticated ? 'authed' : 'anon')
    setActiveChildId((prev) => prev ?? pickChild(next))
  }, [])

  const logout = useCallback(async () => {
    await apiLogout().catch(() => {})
    setMeState(null)
    setActiveChildId(null)
    setStatus('anon')
  }, [])

  const enterDemo = useCallback(() => { setStatus('demo'); setActiveChildId('mem_child') }, [])
  const exitDemo = useCallback(() => { setStatus('anon'); setActiveChildId(null) }, [])
  const exitToHome = useCallback(() => setActiveChildId(null), [])

  const familyId = status === 'demo' ? 'fam_demo' : me?.family?.id ?? null

  const value = useMemo<AuthState>(() => ({
    status, me, activeChildId, familyId,
    setMe, setActiveChild: setActiveChildId, exitToHome, enterDemo, exitDemo, logout, refresh,
  }), [status, me, activeChildId, familyId, setMe, exitToHome, enterDemo, exitDemo, logout, refresh])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
