import { useState } from 'react'
import { useApp } from '../state/store'
import { useAuth } from '../auth/AuthProvider'
import { GoalRow } from '../components/GoalRow'
import { TaskEditor, type Prefill } from '../components/TaskEditor'
import { deleteTask } from '../api'
import type { ScheduleItem } from '../types'

/** 목표 탭 — 이번주·이달의 목표를 설정/관리하고 하루계획에 담는 곳 */
export function GoalsPanel() {
  const { snapshot, childId, reload } = useApp()
  const { status, me } = useAuth()
  const [editor, setEditor] = useState<{ period: 'week' | 'month'; existing?: ScheduleItem } | null>(null)
  const [cascade, setCascade] = useState<Prefill | null>(null)
  if (!snapshot) return null

  const canManage = status !== 'demo'
  const isChild = canManage && me?.member?.role === 'child'
  const week = snapshot.weekGoals
  const month = snapshot.monthGoal

  const onCascade = canManage
    ? (g: ScheduleItem) => setCascade({ title: g.title, category: g.category, goalId: g.id })
    : undefined
  const onDelete = canManage
    ? async (g: ScheduleItem) => { if (window.confirm(`'${g.title}' 목표를 삭제할까요?`)) { await deleteTask(g.id); reload() } }
    : undefined

  return (
    <div className="panel">
      <div className="daterow"><span className="big">우리 목표</span><span className="sub">이루고 싶은 것을 정해요</span></div>
      <p className="goals-intro">{isChild ? '이번주·이번달 내가 이루고 싶은 목표를 정하고, 하루계획에 담아 실천해봐 🎯'
        : '먼저 큰 목표를 정하고, 하루계획에 담아 자녀와 함께 실천해요 🎯'}</p>

      <div className="sechead"><h3>이번주 목표</h3><span className="count">{week.length}개</span></div>
      {week.map((g) => (
        <GoalRow key={g.id} goal={g} onEdit={canManage ? (goal) => setEditor({ period: 'week', existing: goal }) : undefined} onCascade={onCascade} onDelete={onDelete} />
      ))}
      {week.length === 0 && <p className="empty-hint">이번주 이루고 싶은 목표를 정해봐요! 🎯</p>}
      {canManage && (
        <div className="add-row"><button type="button" className="add-btn" onClick={() => setEditor({ period: 'week' })}>＋ 주간 목표 추가</button></div>
      )}

      <div className="sechead" style={{ marginTop: 20 }}><h3>이달의 목표</h3></div>
      {month ? (
        <GoalRow goal={month} onEdit={canManage ? (goal) => setEditor({ period: 'month', existing: goal }) : undefined} onCascade={onCascade} onDelete={onDelete} />
      ) : (
        <>
          <p className="empty-hint">이번달 이루고 싶은 큰 목표를 정해봐요! 📚</p>
          {canManage && (
            <div className="add-row"><button type="button" className="add-btn" onClick={() => setEditor({ period: 'month' })}>＋ 이달의 목표 정하기</button></div>
          )}
        </>
      )}

      {editor && canManage && (
        <TaskEditor childId={childId} period={editor.period} existing={editor.existing}
          onClose={() => setEditor(null)} onSaved={reload} />
      )}
      {cascade && canManage && (
        <TaskEditor childId={childId} period="day" targetDate={snapshot.today} prefill={cascade} defaultRecur="daily"
          onClose={() => setCascade(null)} onSaved={reload} />
      )}
    </div>
  )
}
