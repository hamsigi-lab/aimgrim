import { useEffect, useState } from 'react'
import { useApp } from '../state/store'
import { useAuth } from '../auth/AuthProvider'
import { GoalCard } from '../components/GoalCard'
import { TaskEditor, type Prefill } from '../components/TaskEditor'
import { StudyGoalProgress } from '../components/StudyGoalProgress'
import { StudyGoalEditor } from '../components/StudyGoalEditor'
import { deleteTask, getStudy, DEMO_FAMILY, type StudySnapshot, type StudyGoal } from '../api'
import type { Category, GoalItem, ScheduleItem } from '../types'

// 영역(생활습관·학습이 2대 축, 운동·놀이는 자유 추가) — category가 곧 영역
const AREAS: { cat: Category; emoji: string; name: string; hint: string }[] = [
  { cat: 'life', emoji: '🌿', name: '기본 생활 습관', hint: '예: 방 깨끗이 쓰기, 스스로 일어나기' },
  { cat: 'study', emoji: '📚', name: '학습', hint: '예: 수학 3단원 끝내기, 책 4권 읽기' },
  { cat: 'health', emoji: '💪', name: '운동', hint: '예: 주 3회 운동하기' },
  { cat: 'play', emoji: '🎨', name: '놀이·취미', hint: '예: 그림 5장 그리기' },
]

/** 목표 탭 — 영역별로 목표를 세우고, 그 아래 하루 실천(하위 계획)을 중첩해 담는 곳 */
export function GoalsPanel() {
  const { snapshot, childId, reload } = useApp()
  const { status, me, familyId } = useAuth()
  const fam = status === 'demo' ? DEMO_FAMILY : familyId ?? DEMO_FAMILY
  const [goalEditor, setGoalEditor] = useState<{ period: 'week' | 'month'; category?: Category; existing?: GoalItem } | null>(null)
  const [subEditor, setSubEditor] = useState<{ goalId: string; category: Category; existing?: ScheduleItem; endDate?: string } | null>(null)
  const [study, setStudy] = useState<StudySnapshot | null>(null)
  const [sgEdit, setSgEdit] = useState<StudyGoal | 'new' | null>(null)
  const loadStudy = () => { getStudy(fam, childId).then(setStudy).catch(() => {}) }
  useEffect(loadStudy, [fam, childId])
  if (!snapshot) return null

  const canManage = status !== 'demo'
  const isChild = canManage && me?.member?.role === 'child'
  const goals = snapshot.goals
  const byCat = (cat: Category) => goals.filter((g) => g.category === cat)
  // 2대 영역(생활·학습)은 늘 보이고, 나머지는 목표가 있을 때만
  const areas = AREAS.filter((a) => a.cat === 'life' || a.cat === 'study' || byCat(a.cat).length > 0)

  const onDeleteGoal = async (g: GoalItem) => {
    if (window.confirm(`'${g.title}' 목표를 삭제할까요? 연결된 실천은 남아요.`)) { await deleteTask(g.id); reload() }
  }
  const subPrefill: Prefill | undefined = subEditor && !subEditor.existing
    ? { goalId: subEditor.goalId, category: subEditor.category, endDate: subEditor.endDate } : undefined

  return (
    <div className="panel">
      <div className="daterow"><span className="big">우리 목표</span><span className="sub">이루고 싶은 것을 정해요</span></div>
      <p className="goals-intro">{isChild
        ? '영역별로 목표를 세우고, 그 아래 매일 실천할 일을 담아봐. 실천할수록 목표가 채워져 🎯'
        : '영역별로 큰 목표를 세우고, 그 아래 매일 실천을 담아요. 아이가 실천할수록 목표가 채워집니다 🎯'}</p>

      {areas.map((a) => {
        const list = byCat(a.cat)
        return (
          <section key={a.cat} className="area">
            <div className="sechead">
              <h3><span aria-hidden="true">{a.emoji}</span> {a.name}</h3>
              <span className="count">{list.length}개</span>
            </div>
            {list.map((g) => (
              <GoalCard key={g.id} goal={g} canManage={canManage}
                onEditGoal={(goal) => setGoalEditor({ period: goal.period, existing: goal })}
                onDeleteGoal={onDeleteGoal}
                onAddSub={(goal) => setSubEditor({ goalId: goal.id, category: goal.category, endDate: goal.endDate ?? undefined })}
                onEditSub={(goal, sp) => setSubEditor({ goalId: goal.id, category: goal.category, existing: sp })} />
            ))}
            {list.length === 0 && <p className="empty-hint" style={{ padding: '2px 2px 10px' }}>{a.hint}</p>}
            {canManage && (
              <div className="add-row"><button type="button" className="add-btn" onClick={() => setGoalEditor({ period: 'week', category: a.cat })}>＋ {a.name} 목표 추가</button></div>
            )}
          </section>
        )
      })}

      <section className="area">
        <div className="sechead"><h3><span aria-hidden="true">⏱</span> 순공 목표</h3></div>
        {study?.goals.map((g) => (
          <button type="button" key={g.id} className="sg-editrow" onClick={canManage ? () => setSgEdit(g) : undefined}>
            <StudyGoalProgress goal={g} todayMin={study.today.totalMin} mini />
          </button>
        ))}
        {study && study.goals.length === 0 && <p className="empty-hint" style={{ padding: '2px 2px 10px' }}>방학처럼 기간을 정하고 총 순공시간을 목표로 세워요 (예: 200시간). 매일 순공하면 자동으로 쌓여요.</p>}
        {canManage && (
          <div className="add-row"><button type="button" className="add-btn" onClick={() => setSgEdit('new')}>＋ 순공 목표 세우기</button></div>
        )}
      </section>

      {goalEditor && canManage && (
        <TaskEditor childId={childId} period={goalEditor.period} existing={goalEditor.existing}
          prefill={goalEditor.category ? { category: goalEditor.category } : undefined}
          onClose={() => setGoalEditor(null)} onSaved={reload} />
      )}
      {subEditor && canManage && (
        <TaskEditor childId={childId} period="day" existing={subEditor.existing}
          prefill={subPrefill} targetDate={snapshot.today} defaultRecur="daily"
          onClose={() => setSubEditor(null)} onSaved={reload} />
      )}
      {sgEdit && canManage && (
        <StudyGoalEditor childId={childId} today={study?.date ?? snapshot.today}
          existing={sgEdit === 'new' ? undefined : sgEdit}
          onClose={() => setSgEdit(null)} onSaved={() => { setSgEdit(null); loadStudy() }} />
      )}
    </div>
  )
}
