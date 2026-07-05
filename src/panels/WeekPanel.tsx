import { useState } from 'react'
import { useApp } from '../state/store'
import { useAuth } from '../auth/AuthProvider'
import { TaskEditor } from '../components/TaskEditor'
import { weekInfo } from '../lib/calendar'
import type { ScheduleItem } from '../types'

function ProgressRing({ pct, isToday }: { pct: number; isToday: boolean }) {
  const r = 8
  const circ = 2 * Math.PI * r
  const off = circ * (1 - pct / 100)
  const track = isToday ? 'rgba(255,255,255,.4)' : '#E4EEEA'
  const fill = isToday ? '#fff' : '#2FB79A'
  return (
    <svg className="ring" viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="11" cy="11" r={r} fill="none" stroke={track} strokeWidth="3" />
      <circle cx="11" cy="11" r={r} fill="none" stroke={fill} strokeWidth="3" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={off} transform="rotate(-90 11 11)" />
    </svg>
  )
}

const AUTHOR_LABEL: Record<ScheduleItem['author'], string> = { me: '내가', mom: '엄마가', dad: '아빠가' }

function GoalRow({ goal, onEdit }: { goal: ScheduleItem; onEdit?: (g: ScheduleItem) => void }) {
  const done = goal.progress >= 100
  const inner = (
    <div className={`task readonly${done ? ' done' : ''}`}>
      <span className={`cat ${goal.category}`} aria-hidden="true" />
      <span className="check">
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M4 10.5l4 4 8-9" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="tmid">
        <span className="t">{goal.title}</span>
        <span className="tmeta">
          <span className={`who ${goal.author}`}>{AUTHOR_LABEL[goal.author]}</span>
          <span className="time">{goal.progressLabel || `${goal.progress}%`}</span>
        </span>
      </span>
      <span className="pts">+{goal.points} ⭐</span>
    </div>
  )
  if (!onEdit) return inner
  return (
    <div className="task-wrap">
      {inner}
      <div className="task-side">
        <button type="button" className="edit-handle" aria-label="고치기" onClick={() => onEdit(goal)}>✎</button>
      </div>
    </div>
  )
}

export function WeekPanel() {
  const { snapshot, childId, reload } = useApp()
  const { status } = useAuth()
  const [editor, setEditor] = useState<{ existing?: ScheduleItem } | null>(null)
  if (!snapshot) return null
  const canManage = status !== 'demo'
  const week = weekInfo(snapshot.today, snapshot.history, snapshot.dayTaskCount)

  return (
    <div className="panel">
      <div className="daterow"><span className="big">이번주</span><span className="sub">{week.label}</span></div>

      <div className="weekstrip">
        {week.days.map((d) => (
          <div key={d.date} className={`day${d.isToday ? ' today' : ''}`}>
            <div className="dn">{d.dayName}</div>
            <div className="dd">{d.dayNum}</div>
            <ProgressRing pct={d.completion} isToday={d.isToday} />
          </div>
        ))}
      </div>

      <div className="sechead"><h3>주간 목표</h3><span className="count">{snapshot.weekGoals.length}개</span></div>
      {snapshot.weekGoals.map((g) => (
        <GoalRow key={g.id} goal={g} onEdit={canManage ? (goal) => setEditor({ existing: goal }) : undefined} />
      ))}
      {snapshot.weekGoals.length === 0 && <p className="empty-hint">이번주 이루고 싶은 목표를 정해봐요! 🎯</p>}

      {canManage && (
        <div className="add-row">
          <button type="button" className="add-btn" onClick={() => setEditor({})}>＋ 주간 목표 추가</button>
        </div>
      )}

      {editor && canManage && (
        <TaskEditor childId={childId} period="week" existing={editor.existing}
          onClose={() => setEditor(null)} onSaved={reload} />
      )}
    </div>
  )
}
