import type { Category } from '../types'

// 진행률 구간별 그리미 성장 단계 (마일스톤에서 '변신')
function tier(progress: number): { emoji: string; label: string } {
  if (progress >= 100) return { emoji: '🌟', label: '완성!' }
  if (progress >= 75) return { emoji: '🌸', label: '활짝' }
  if (progress >= 50) return { emoji: '🌷', label: '꽃봉오리' }
  if (progress >= 25) return { emoji: '🌿', label: '쑥쑥' }
  return { emoji: '🌱', label: '새싹' }
}

/** 미니 그리미 — 여정 경로 위에서 목표를 향해 걷는 마스코트 */
function GrimiMini({ done }: { done: boolean }) {
  return (
    <svg viewBox="0 0 44 44" width="34" height="34" aria-hidden="true">
      <circle cx="22" cy="24" r="16" fill="#7BD9BC" />
      <circle cx="22" cy="24" r="16" fill="url(#gj)" />
      <defs><radialGradient id="gj" cx="40%" cy="34%" r="70%"><stop offset="0" stopColor="#A8ECD6" /><stop offset="1" stopColor="#57C9A6" /></radialGradient></defs>
      <path d="M22 10 C21 4 15 1 11 0 C14 4 15 8 18 10 Z" fill="#3FBF8E" />
      <path d="M22 10 C23 4 29 1 33 0 C30 4 29 8 26 10 Z" fill="#59CC9E" />
      <circle cx="16" cy="23" r="2.6" fill="#20463C" />
      <circle cx="28" cy="23" r="2.6" fill="#20463C" />
      <circle cx="13" cy="28" r="2.4" fill="#FF9CB4" opacity=".65" />
      <circle cx="31" cy="28" r="2.4" fill="#FF9CB4" opacity=".65" />
      {done
        ? <path d="M17 27 Q22 33 27 27" stroke="#20463C" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        : <path d="M18 28 Q22 31 26 28" stroke="#20463C" strokeWidth="2.4" fill="none" strokeLinecap="round" />}
    </svg>
  )
}

const MILESTONES = [25, 50, 75]

/** 목표를 목적지로, 그리미가 진행률만큼 경로를 걸어가는 여정 시각화 */
export function GrimiJourney({ progress, category = 'study' }: { progress: number; category?: Category }) {
  const pct = Math.max(0, Math.min(100, progress))
  const t = tier(pct)
  const done = pct >= 100
  return (
    <div className={`journey cat-${category}${done ? ' done' : ''}`}>
      <div className="jn-track">
        <div className="jn-fill" style={{ width: `${pct}%` }} />
        {MILESTONES.map((m) => (
          <span key={m} className={`jn-node${pct >= m ? ' passed' : ''}`} style={{ left: `${m}%` }} />
        ))}
        <span className={`jn-goal${done ? ' reached' : ''}`} aria-label="목표">🏁</span>
        <span className="jn-grimi" style={{ left: `${pct}%` }}>
          <span className="jn-tier" aria-hidden="true">{t.emoji}</span>
          <GrimiMini done={done} />
        </span>
      </div>
      <div className="jn-caption">
        <span className="jn-pct">{pct}%</span>
        <span className="jn-tierlabel">{done ? '🎉 목표 도착!' : `${t.emoji} ${t.label} · 목표까지 ${100 - pct}%`}</span>
      </div>
    </div>
  )
}
