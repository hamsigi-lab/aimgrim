import { useState } from 'react'
import { useApp } from '../state/store'
import { useAuth } from '../auth/AuthProvider'
import { TaskRow } from '../components/TaskRow'
import { TaskEditor } from '../components/TaskEditor'
import { EncourageComposer } from '../components/EncourageComposer'
import { approveTask } from '../api'
import type { ScheduleItem } from '../types'

export function TodayPanel() {
  const { snapshot, childId, toggleTask, doneCount, todayTotal, reload } = useApp()
  const { status, me } = useAuth()
  const [editor, setEditor] = useState<{ existing?: ScheduleItem } | null>(null)
  const [encourage, setEncourage] = useState(false)
  if (!snapshot) return null

  const canManage = status !== 'demo'
  const isParent = canManage && me?.member?.role === 'parent'
  const hero = snapshot.weekGoals[0]

  async function onApprove(id: string) { await approveTask(id); reload() }

  return (
    <div className="panel">
      <div className="daterow"><span className="big">7월 5일</span><span className="sub">토요일 · 오늘</span></div>

      {hero && (
        <div className="goal">
          <div className="lab">이번주 목표</div>
          <div className="txt">{hero.title} 💪</div>
          <div className="bar"><i style={{ width: `${hero.progress}%` }} /></div>
          <div className="pct">{hero.progress}% · 조금만 더!</div>
          <svg className="blob" viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="48" fill="rgba(255,255,255,.18)" />
            <circle cx="60" cy="60" r="30" fill="rgba(255,255,255,.16)" />
          </svg>
        </div>
      )}

      {isParent && (
        <div className="approve">
          <span className="ai" aria-hidden="true">🧡</span>
          <span className="atx">아이가 해낸 일을 확인하고 응원해 주세요</span>
          <button type="button" className="abtn" onClick={() => setEncourage(true)}>격려 보내기</button>
        </div>
      )}

      <div className="sechead">
        <h3>오늘 할일</h3>
        <span className="count">{doneCount} / {todayTotal} 완료</span>
      </div>

      {snapshot.todayTasks.map((t) => (
        <TaskRow
          key={t.id} task={t} onToggle={toggleTask}
          onEdit={canManage ? (task) => setEditor({ existing: task }) : undefined}
          canApprove={isParent} onApprove={onApprove}
        />
      ))}

      {snapshot.todayTasks.length === 0 && (
        <p className="empty-hint">아직 오늘 할일이 없어요. 아래에서 추가해 봐요! 🌱</p>
      )}

      {canManage && (
        <div className="add-row">
          <button type="button" className="add-btn" onClick={() => setEditor({})}>＋ 할일 추가</button>
        </div>
      )}

      {editor && canManage && (
        <TaskEditor childId={childId} period="day" existing={editor.existing}
          onClose={() => setEditor(null)} onSaved={reload} />
      )}
      {encourage && isParent && (
        <EncourageComposer childId={childId} onClose={() => setEncourage(false)} onSaved={reload} />
      )}
    </div>
  )
}
