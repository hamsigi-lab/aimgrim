import { useState } from 'react'
import { useApp } from '../state/store'
import { useAuth } from '../auth/AuthProvider'
import { TaskEditor } from '../components/TaskEditor'
import { monthInfo } from '../lib/calendar'
import type { ScheduleItem } from '../types'

const MONTH_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function MonthPanel() {
  const { snapshot, childId, reload } = useApp()
  const { status } = useAuth()
  const [editor, setEditor] = useState<{ existing?: ScheduleItem } | null>(null)
  if (!snapshot) return null
  const canManage = status !== 'demo'
  const goal = snapshot.monthGoal
  const month = monthInfo(snapshot.today, snapshot.history, snapshot.dayTaskCount)

  return (
    <div className="panel">
      <div className="daterow"><span className="big">이번달</span><span className="sub">{month.label}</span></div>

      <div className="month">
        <div className="mtitle"><b>{month.label}</b><span>{month.doneDays > 0 ? `완료한 날 ${month.doneDays}일 🔥` : '이번달 첫 기록을 만들어봐요'}</span></div>
        <div className="grid">
          {MONTH_WEEKDAYS.map((w) => <div key={w} className="wd">{w}</div>)}
          {month.cells.map((c, i) => (
            <div key={i}
              className={`cell${c.level === 3 ? ' lv3' : c.level === 2 ? ' lv2' : c.level === 1 ? ' lv1' : ''}${c.isToday ? ' today' : ''}${c.day === null ? ' mut' : ''}`}>
              {c.day ?? ''}
            </div>
          ))}
        </div>
      </div>

      <div className="sechead"><h3>이달의 목표</h3></div>
      {goal ? (
        <div className="goal grape" onClick={canManage ? () => setEditor({ existing: goal }) : undefined}
          style={canManage ? { cursor: 'pointer' } : undefined}>
          <div className="lab">이달의 큰 목표{canManage ? ' · 눌러서 고치기' : ''}</div>
          <div className="txt">{goal.title} 📚</div>
          <div className="bar"><i style={{ width: `${goal.progress}%` }} /></div>
          <div className="pct">{goal.progressLabel || `${goal.progress}%`}</div>
          <svg className="blob" viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="48" fill="rgba(255,255,255,.18)" />
          </svg>
        </div>
      ) : (
        <>
          <p className="empty-hint">이번달 이루고 싶은 큰 목표를 정해봐요! 📚</p>
          {canManage && (
            <div className="add-row">
              <button type="button" className="add-btn" onClick={() => setEditor({})}>＋ 이달의 목표 정하기</button>
            </div>
          )}
        </>
      )}

      {editor && canManage && (
        <TaskEditor childId={childId} period="month" existing={editor.existing}
          onClose={() => setEditor(null)} onSaved={reload} />
      )}
    </div>
  )
}
