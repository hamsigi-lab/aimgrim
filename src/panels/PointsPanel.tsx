import { useState } from 'react'
import { useApp } from '../state/store'
import { useAuth } from '../auth/AuthProvider'
import { Mascot } from '../components/Mascot'
import { RewardEditor } from '../components/RewardEditor'
import { deleteRewardGoal } from '../api'

const SAYINGS = [
  '잘하고 있어! 조금만 더 모으면 돼 ✨',
  '우와, 또 해냈네! 최고야 🎉',
  '네가 스스로 해내는 게 멋져 😊',
  '목표까지 얼마 안 남았어! 🎯',
]

export function PointsPanel({ celebrating }: { celebrating: boolean }) {
  const { snapshot, childId, points, reload } = useApp()
  const { status } = useAuth()
  const [adding, setAdding] = useState(false)
  if (!snapshot) return null
  const canManage = status !== 'demo'
  const say = SAYINGS[Math.floor(points / 40) % SAYINGS.length]
  const cheer = snapshot.encouragements[0] // 최신 응원 (역할 무관)
  const cheerFrom = cheer?.from === 'dad' ? '아빠' : '엄마'

  async function removeReward(id: string) { await deleteRewardGoal(id); reload() }

  return (
    <div className="panel">
      <div className={`mascotcard${celebrating ? ' cheer' : ''}`}>
        <div className="mwrap"><Mascot /></div>
        <div className="say">{say}</div>
      </div>

      <div className="bigpts">
        <div className="n">{points}</div>
        <div className="l">모은 별점 ⭐</div>
      </div>

      <div className="sechead"><h3>갖고 싶은 것</h3><span className="count">내가 정한 목표</span></div>

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
              <button type="button" className="reward-del" aria-label="삭제" onClick={() => removeReward(r.id)}>✕</button>
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
    </div>
  )
}
