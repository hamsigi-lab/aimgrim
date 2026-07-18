import { useEffect, useState } from 'react'
import { useApp } from '../state/store'
import { useAuth } from '../auth/AuthProvider'
import { Mascot } from '../components/Mascot'
import { RewardEditor } from '../components/RewardEditor'
import { LedgerSheet } from '../components/LedgerSheet'
import { ActivityView } from '../parent/ActivityView'
import { deleteRewardGoal, redeemRewardGoal, getOverview, DEMO_FAMILY, type ChildOverview } from '../api'

const fh = (m: number) => (m < 60 ? `${m}분` : `${Math.round((m / 60) * 10) / 10}시간`)

const SAYINGS = [
  '잘하고 있어! 조금만 더 모으면 돼 ✨',
  '우와, 또 해냈네! 최고야 🎉',
  '네가 스스로 해내는 게 멋져 😊',
  '목표까지 얼마 안 남았어! 🎯',
]

export function PointsPanel({ celebrating }: { celebrating: boolean }) {
  const { snapshot, childId, points, reload } = useApp()
  const { status, familyId } = useAuth()
  const fam = status === 'demo' ? DEMO_FAMILY : familyId ?? DEMO_FAMILY
  const [adding, setAdding] = useState(false)
  const [ledgerOpen, setLedgerOpen] = useState(false)
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [family, setFamily] = useState<ChildOverview[] | null>(null)
  const [viewSib, setViewSib] = useState<{ id: string; name: string } | null>(null)
  useEffect(() => { getOverview(fam).then((r) => setFamily(r.children)).catch(() => setFamily(null)) }, [fam])

  if (viewSib) {
    return <ActivityView childId={viewSib.id} name={viewSib.name} canManage={false}
      greeting="함께 응원해요 💪" onBack={() => setViewSib(null)} />
  }
  if (!snapshot) return null
  const canManage = status !== 'demo'
  const say = SAYINGS[Math.floor(points / 40) % SAYINGS.length]
  const cheer = snapshot.encouragements[0] // 최신 응원 (역할 무관)
  const cheerFrom = cheer?.from === 'dad' ? '아빠' : '엄마'

  async function removeReward(id: string) { await deleteRewardGoal(id); reload() }
  async function redeem(id: string, title: string) {
    if (!window.confirm(`'${title}'(으)로 별점을 바꿀까요? 🎁`)) return
    setRedeeming(id)
    try { await redeemRewardGoal(id); reload() }
    finally { setRedeeming(null) }
  }

  return (
    <div className="panel">
      <div className={`mascotcard${celebrating ? ' cheer' : ''}`}>
        <div className="mwrap"><Mascot /></div>
        <div className="say">{say}</div>
      </div>

      <div className="bigpts">
        <div className="n">{points}</div>
        <div className="l">모은 별점 ⭐</div>
        <button type="button" className="linkbtn" onClick={() => setLedgerOpen(true)}>별점 내역 보기 →</button>
      </div>

      {family && family.length >= 2 && (
        <>
          <div className="sechead"><h3>💪 함께 힘내는 우리 가족</h3></div>
          <div className="fam-cards">
            {family.map((ch) => (
              <button type="button" className={`fam-card${ch.id === childId ? ' me' : ''}`} key={ch.id} onClick={() => setViewSib({ id: ch.id, name: ch.name })}>
                <span className="fam-av" aria-hidden="true">🌱</span>
                <span className="fam-mid">
                  <span className="fam-name">{ch.name}{ch.id === childId && <em className="fam-me">나</em>}</span>
                  <span className="fam-chips">📋 {ch.todayDone}/{ch.todayTotal} · 🎯 {ch.goalDone}/{ch.goalTotal} · ⏱ {fh(ch.studyMin)}</span>
                </span>
                <span className="fam-pts">⭐ {ch.points}</span>
              </button>
            ))}
          </div>
          <p className="empty-hint" style={{ paddingTop: 2 }}>서로의 하루를 보고 응원해요. 순위는 없어요 🙂</p>
        </>
      )}

      <div className="sechead" style={{ marginTop: 18 }}><h3>갖고 싶은 것</h3><span className="count">내가 정한 목표</span></div>

      {snapshot.rewardGoals.map((r) => {
        // 진행률은 현재 보유 별점 기준 (별도 저축 개념 없이 단일 지갑)
        const saved = Math.min(points, r.cost)
        const pct = r.redeemed ? 100 : Math.min(100, Math.round((saved / r.cost) * 100))
        const reachable = !r.redeemed && points >= r.cost
        const remaining = Math.max(0, r.cost - points)
        return (
          <div className={`reward${r.redeemed ? ' redeemed' : ''}`} key={r.id}>
            <div className={`rico ${r.tone}`} aria-hidden="true">{r.emoji}</div>
            <div className="rmid">
              <div className="rt">{r.title}</div>
              <div className="rbar"><i style={{ width: `${pct}%` }} /></div>
              <div className="rmeta">
                {r.redeemed ? '🎁 받았어요!' : `${saved} / ${r.cost} ⭐${reachable ? ' · 바꿀 수 있어요!' : ` · ${remaining} 남음`}`}
              </div>
            </div>
            {canManage && !r.redeemed && (
              reachable ? (
                <button type="button" className="reward-redeem" disabled={redeeming === r.id} onClick={() => redeem(r.id, r.title)}>
                  {redeeming === r.id ? '…' : '🎁 바꾸기'}
                </button>
              ) : (
                <button type="button" className="reward-del" aria-label="삭제" onClick={() => removeReward(r.id)}>✕</button>
              )
            )}
          </div>
        )
      })}

      {snapshot.rewardGoals.length === 0 && <p className="empty-hint">별점을 모아 이루고 싶은 목표를 정해봐요! 🎯</p>}

      {canManage && (
        <div className="add-row">
          <button type="button" className="add-btn" onClick={() => setAdding(true)}>＋ 갖고 싶은 것 추가</button>
        </div>
      )}

      {cheer && (
        <div className={`cheer-card${cheer.from === 'dad' ? ' dad' : ''}`}>
          <div className="from">{cheer.from === 'dad' ? '🧡' : '💜'} {cheerFrom}의 응원</div>
          <div className="msg">{cheer.message}</div>
        </div>
      )}

      {adding && canManage && (
        <RewardEditor childId={childId} onClose={() => setAdding(false)} onSaved={reload} />
      )}
      {ledgerOpen && <LedgerSheet childId={childId} onClose={() => setLedgerOpen(false)} />}
    </div>
  )
}
