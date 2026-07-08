import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react'
import type { Snapshot } from '../types'
import { fetchSnapshot, toggleTask as apiToggle, type Surprise } from '../api'

interface AppState {
  childId: string
  loading: boolean
  error: string | null
  snapshot: Snapshot | null
  points: number
  /** 마지막으로 획득한 별점 — 축하 애니메이션용 */
  lastGain: number
  /** 축하 이벤트 카운터 */
  celebrateTick: number
  doneCount: number
  todayTotal: number
  toggleTask: (id: string) => void
  reload: () => void
  /** 깜짝 상자 (도착 시 열기) */
  surprise: Surprise | null
  showSurprise: (s: Surprise) => void
  clearSurprise: () => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider(
  { familyId, childId, children }: { familyId: string; childId: string; children: ReactNode },
) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [points, setPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastGain, setLastGain] = useState(0)
  const [celebrateTick, setCelebrateTick] = useState(0)
  const [surprise, setSurprise] = useState<Surprise | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchSnapshot(familyId, childId)
      .then((snap) => { setSnapshot(snap); setPoints(snap.child.points) })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '불러오기 실패'))
      .finally(() => setLoading(false))
  }, [familyId, childId])

  useEffect(() => { load() }, [load])

  const toggleTask = useCallback((id: string) => {
    setSnapshot((prev) => {
      if (!prev) return prev
      const task = prev.todayTasks.find((t) => t.id === id)
      if (!task) return prev
      const nextDone = !task.done
      // 낙관적 업데이트
      if (nextDone) {
        setPoints((p) => p + task.points)
        setLastGain(task.points)
        setCelebrateTick((c) => c + 1)
      } else {
        setPoints((p) => Math.max(0, p - task.points))
      }
      // 서버 반영 (실패 시 되돌리기)
      apiToggle(id, childId)
        .then((res) => { setPoints(res.points); if (res.surprise) setSurprise(res.surprise) })
        .catch(() => {
          setPoints((p) => (nextDone ? Math.max(0, p - task.points) : p + task.points))
          setSnapshot((s) =>
            s ? { ...s, todayTasks: s.todayTasks.map((t) => (t.id === id ? { ...t, done: !nextDone } : t)) } : s,
          )
          setError('저장에 실패했어요. 다시 시도해 주세요.')
        })
      return {
        ...prev,
        todayTasks: prev.todayTasks.map((t) => (t.id === id ? { ...t, done: nextDone } : t)),
      }
    })
  }, [childId])

  const doneCount = snapshot?.todayTasks.filter((t) => t.done).length ?? 0
  const todayTotal = snapshot?.todayTasks.length ?? 0

  const showSurprise = useCallback((s: Surprise) => setSurprise(s), [])
  const clearSurprise = useCallback(() => setSurprise(null), [])

  const value = useMemo<AppState>(
    () => ({ childId, loading, error, snapshot, points, lastGain, celebrateTick, doneCount, todayTotal, toggleTask, reload: load, surprise, showSurprise, clearSurprise }),
    [childId, loading, error, snapshot, points, lastGain, celebrateTick, doneCount, todayTotal, toggleTask, load, surprise, showSurprise, clearSurprise],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
