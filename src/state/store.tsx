import {
  createContext, useCallback, useContext, useMemo, useState, type ReactNode,
} from 'react'
import type { Task } from '../types'
import { todayTasks as initialTasks, startingPoints } from '../data/mock'

interface AppState {
  points: number
  tasks: Task[]
  /** 마지막으로 획득한 별점 — 축하 애니메이션 트리거 (0이면 없음) */
  lastGain: number
  /** 축하 이벤트 카운터 — 같은 값 연속 획득도 구분하기 위해 */
  celebrateTick: number
  toggleTask: (id: string) => void
  doneCount: number
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [points, setPoints] = useState(startingPoints)
  const [lastGain, setLastGain] = useState(0)
  const [celebrateTick, setCelebrateTick] = useState(0)

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        const nextDone = !t.done
        if (nextDone) {
          setPoints((p) => p + t.points)
          setLastGain(t.points)
          setCelebrateTick((c) => c + 1)
        } else {
          setPoints((p) => p - t.points)
        }
        return { ...t, done: nextDone }
      }),
    )
  }, [])

  const doneCount = tasks.filter((t) => t.done).length

  const value = useMemo<AppState>(
    () => ({ points, tasks, lastGain, celebrateTick, toggleTask, doneCount }),
    [points, tasks, lastGain, celebrateTick, toggleTask, doneCount],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
