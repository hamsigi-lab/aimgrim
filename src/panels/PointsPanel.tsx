import { useApp } from '../state/store'
import { Mascot } from '../components/Mascot'
import { rewardGoals, encouragements } from '../data/mock'

const SAYINGS = [
  '잘하고 있어! 조금만 더 모으면 돼 ✨',
  '우와, 또 해냈네! 최고야 🎉',
  '네가 스스로 해내는 게 멋져 😊',
  '미술 세트까지 얼마 안 남았어! 🎨',
]

export function PointsPanel({ celebrating }: { celebrating: boolean }) {
  const { points } = useApp()
  const say = SAYINGS[Math.floor(points / 40) % SAYINGS.length]
  const cheer = encouragements.find((e) => e.from === 'dad')

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

      {rewardGoals.map((r) => {
        const pct = Math.min(100, Math.round((r.saved / r.cost) * 100))
        const reachable = points >= r.cost
        const remaining = Math.max(0, r.cost - r.saved)
        return (
          <div className="reward" key={r.id}>
            <div className={`rico ${r.tone}`} aria-hidden="true">{r.emoji}</div>
            <div className="rmid">
              <div className="rt">{r.title}</div>
              <div className="rbar"><i style={{ width: `${pct}%` }} /></div>
              <div className="rmeta">
                {r.saved} / {r.cost} ⭐{reachable ? ' · 교환 가능!' : ''}
              </div>
            </div>
            <div className="rgo">
              {reachable ? '🎉 완료' : remaining >= 500 ? '큰 목표' : `${remaining} 남음`}
            </div>
          </div>
        )
      })}

      {cheer && (
        <div className="cheer-card dad">
          <div className="from">🧡 아빠의 응원</div>
          <div className="msg">{cheer.message}</div>
        </div>
      )}
    </div>
  )
}
