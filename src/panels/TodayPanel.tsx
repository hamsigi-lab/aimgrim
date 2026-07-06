import { useState } from 'react'
import { useApp } from '../state/store'
import { useAuth } from '../auth/AuthProvider'
import { TaskRow } from '../components/TaskRow'
import { TaskEditor } from '../components/TaskEditor'
import { EncourageComposer } from '../components/EncourageComposer'
import { TemplatePicker } from '../components/TemplatePicker'
import { approveTask } from '../api'
import { todayLabel } from '../lib/calendar'
import type { ScheduleItem } from '../types'

export function TodayPanel({ onGoToWeek }: { onGoToWeek?: () => void }) {
  const { snapshot, childId, toggleTask, doneCount, todayTotal, reload } = useApp()
  const { status, me } = useAuth()
  const [editor, setEditor] = useState<{ existing?: ScheduleItem } | null>(null)
  const [encourage, setEncourage] = useState(false)
  const [templates, setTemplates] = useState(false)
  if (!snapshot) return null

  const canManage = status !== 'demo'
  const isParent = canManage && me?.member?.role === 'parent'
  const isChild = !isParent
  const weekGoals = snapshot.weekGoals
  const date = todayLabel(snapshot.today)

  async function onApprove(id: string) { await approveTask(id); reload() }

  return (
    <div className="panel">
      <div className="daterow">
        <span className="big">{date.big}</span><span className="sub">{date.sub}</span>
        {snapshot.streak > 0 && <span className="streak-chip">🔥 {snapshot.streak}일째</span>}
      </div>

      {weekGoals.length > 0 && (
        <button type="button" className="wg-mini" onClick={onGoToWeek}>
          <span className="wg-lab">🎯 이번주 목표 {weekGoals.length}</span>
          <span className="wg-strip">
            {weekGoals.map((g) => (
              <span className="wg-pill" key={g.id}>
                <span className={`wg-dot ${g.category}`} aria-hidden="true" />
                <span className="wg-name">{g.title}</span>
                <span className="wg-pct">{g.progress}%</span>
              </span>
            ))}
          </span>
        </button>
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
        <p className="empty-hint">{isChild ? '오늘 내가 해볼 일을 스스로 정해봐 🌱' : '아직 오늘 할일이 없어요. 추천 루틴으로 시작하거나 직접 추가해 주세요! 🌱'}</p>
      )}

      {canManage && (
        <div className="add-row" style={{ flexDirection: 'column', gap: 8 }}>
          <button type="button" className="add-btn" onClick={() => setEditor({})}>
            {isChild ? '＋ 오늘 내가 할 일 정하기' : '＋ 할일 추가'}
          </button>
          {snapshot.todayTasks.length === 0 && (
            <button type="button" className="add-btn tpl" onClick={() => setTemplates(true)}>✨ 추천 루틴으로 시작하기</button>
          )}
        </div>
      )}

      {editor && canManage && (
        <TaskEditor childId={childId} period="day" existing={editor.existing}
          onClose={() => setEditor(null)} onSaved={reload} />
      )}
      {encourage && isParent && (
        <EncourageComposer childId={childId} onClose={() => setEncourage(false)} onSaved={reload} />
      )}
      {templates && canManage && (
        <TemplatePicker childId={childId} onClose={() => setTemplates(false)} onSaved={reload} />
      )}
    </div>
  )
}
