import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { fetchSnapshot, getStudy, DEMO_FAMILY, type StudySnapshot } from '../api'
import type { Snapshot } from '../types'

const fh = (m: number) => (m <= 0 ? '0분' : m < 60 ? `${m}분` : `${Math.round((m / 60) * 10) / 10}시간`)
const AUTHOR: Record<string, string> = { me: '스스로', mom: '엄마', dad: '아빠' }

/** 부모용 — 자녀의 오늘 활동을 한눈에 보는 모니터 화면 (읽기 전용). */
export function ActivityView({ childId, name, onBack, onManage }: {
  childId: string
  name: string
  onBack: () => void
  onManage: () => void
}) {
  const { familyId } = useAuth()
  const fam = familyId ?? DEMO_FAMILY
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [study, setStudy] = useState<StudySnapshot | null>(null)

  useEffect(() => {
    fetchSnapshot(fam, childId).then(setSnap).catch(() => setSnap(null))
    getStudy(fam, childId).then(setStudy).catch(() => setStudy(null))
  }, [fam, childId])

  const tasks = snap?.todayTasks ?? []
  const goals = snap?.goals ?? []
  const doneTasks = tasks.filter((t) => t.done)
  const leftTasks = tasks.filter((t) => !t.done)
  const doneGoals = goals.filter((g) => g.todayDone)
  const leftGoals = goals.filter((g) => !g.todayDone)
  const sessions = study?.today.sessions ?? []
  const nothingDone = doneTasks.length === 0 && doneGoals.length === 0 && sessions.length === 0

  return (
    <div className="app">
      <header className="appbar">
        <button type="button" className="menu-btn" aria-label="뒤로" onClick={onBack} style={{ marginRight: 2 }}>‹</button>
        <div className="hi">
          <div className="greet">오늘 활동을 한눈에 💛</div>
          <div className="name">{name}의 오늘</div>
        </div>
        <button type="button" className="av-manage" onClick={onManage}>아이 화면 ›</button>
      </header>

      <main className="body">
        {!snap ? (
          <p className="empty-hint">불러오는 중…</p>
        ) : (
          <>
            {/* 요약 */}
            <div className="av-sum">
              <div className="av-stat"><b>{doneTasks.length}/{tasks.length}</b><span>할일</span></div>
              <div className="av-stat"><b>{doneGoals.length}/{goals.length}</b><span>목표</span></div>
              <div className="av-stat"><b>{fh(study?.today.totalMin ?? 0)}</b><span>순공</span></div>
              <div className="av-stat"><b>{snap.child.points}</b><span>별점</span></div>
            </div>
            {snap.streak > 0 && <div className="av-streak">🔥 {snap.streak}일 연속 실천 중</div>}

            {/* 오늘 한 일 */}
            <div className="sechead" style={{ marginTop: 18 }}><h3>✅ 오늘 해낸 것</h3></div>
            {nothingDone && <p className="empty-hint">아직 오늘 활동 기록이 없어요.</p>}

            {doneGoals.map((g) => (
              <div key={g.id} className="av-item">
                <span className={`cat ${g.category}`} aria-hidden="true" />
                <span className="av-mid">
                  <span className="av-t">🎯 {g.title}</span>
                  {g.todayNote ? <span className="av-note">{g.todayNote}</span> : <span className="av-sub">목표 실천 체크</span>}
                </span>
              </div>
            ))}
            {doneTasks.map((t) => (
              <div key={t.id} className="av-item">
                <span className={`cat ${t.category}`} aria-hidden="true" />
                <span className="av-mid">
                  <span className="av-t">{t.title}{t.approved && <em className="av-ok">💛 확인함</em>}</span>
                  <span className="av-sub">
                    {t.note ? `📝 ${t.note}` : `${AUTHOR[t.author]} 계획`}{typeof t.minutes === 'number' && t.minutes > 0 ? ` · ${t.minutes}분` : ''}
                  </span>
                </span>
                <span className="av-pts">+{t.points}⭐</span>
              </div>
            ))}
            {sessions.map((s) => (
              <div key={s.id} className="av-item">
                <span className="av-dot" style={{ background: s.color }} aria-hidden="true" />
                <span className="av-mid">
                  <span className="av-t">⏱ {s.subjectName} {fh(s.minutes)}</span>
                  {s.note && <span className="av-note">{s.note}</span>}
                </span>
              </div>
            ))}

            {/* 아직 남은 것 */}
            {(leftTasks.length > 0 || leftGoals.length > 0) && (
              <>
                <div className="sechead" style={{ marginTop: 18 }}><h3>⏳ 아직 남은 것</h3></div>
                {leftGoals.map((g) => (
                  <div key={g.id} className="av-item left">
                    <span className="av-circle" aria-hidden="true" />
                    <span className="av-mid"><span className="av-t">🎯 {g.title}</span></span>
                    {typeof g.dDay === 'number' && g.dDay >= 0 && <span className="av-dday">D-{g.dDay}</span>}
                  </div>
                ))}
                {leftTasks.map((t) => (
                  <div key={t.id} className="av-item left">
                    <span className="av-circle" aria-hidden="true" />
                    <span className="av-mid"><span className="av-t">{t.title}</span></span>
                    <span className="av-pts">+{t.points}⭐</span>
                  </div>
                ))}
              </>
            )}

            {/* 순공 누적 */}
            {study && study.goals[0] && (
              <>
                <div className="sechead" style={{ marginTop: 18 }}><h3>⏱ 순공 목표</h3></div>
                <div className="av-sg">
                  <div className="av-sgtop"><span>{study.goals[0].title}</span><b>{fh(study.goals[0].accumulatedMin)} / {fh(study.goals[0].targetMin)}</b></div>
                  <div className="av-sgbar"><i style={{ width: `${study.goals[0].progress}%` }} /></div>
                  <span className="av-sgmeta">{study.goals[0].progress}% · 이번주 {fh(study.week.total)} · {study.goals[0].daysLeft >= 0 ? `D-${study.goals[0].daysLeft}` : '완료'}</span>
                </div>
              </>
            )}

            {/* 최근 격려 */}
            {snap.encouragements.length > 0 && (
              <>
                <div className="sechead" style={{ marginTop: 18 }}><h3>💌 최근 격려</h3></div>
                {snap.encouragements.slice(0, 3).map((e) => (
                  <div key={e.id} className="av-cheer"><b>{e.from === 'dad' ? '아빠' : '엄마'}</b> {e.message}</div>
                ))}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
