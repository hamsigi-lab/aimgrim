import { useState } from 'react'
import { createRewardGoal } from '../api'
import type { RewardTone } from '../types'

const EMOJIS = ['🎮', '🎨', '🚲', '📚', '⚽', '🎸', '🧸', '🍰', '🎁', '👟']
const TONES: RewardTone[] = ['grape', 'apricot', 'mint']

export function RewardEditor({ childId, onClose, onSaved }: { childId: string; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('🎁')
  const [cost, setCost] = useState(300)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // 이모지에 따라 색 톤을 순환 배정
  const tone: RewardTone = TONES[EMOJIS.indexOf(emoji) % TONES.length] ?? 'mint'

  async function save() {
    if (!title.trim()) return
    setBusy(true); setErr(null)
    try { await createRewardGoal({ childId, title: title.trim(), emoji, tone, cost }); onSaved(); onClose() }
    catch { setErr('저장에 실패했어요.'); setBusy(false) }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="갖고 싶은 것 추가">
        <div className="grip" />
        <h3>갖고 싶은 것 정하기 🎯</h3>
        <p className="sub">별점을 모아서 이루고 싶은 목표를 골라봐요.</p>
        <div className="form">
          {err && <div className="formerr">{err}</div>}
          <div className="field">
            <label htmlFor="r-title">무엇을 갖고 싶어요?</label>
            <input id="r-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 새 자전거" maxLength={24} autoFocus />
          </div>
          <div className="field">
            <label>아이콘</label>
            <div className="child-switch">
              {EMOJIS.map((e) => (
                <button type="button" key={e} className={emoji === e ? 'on' : ''} onClick={() => setEmoji(e)} style={{ fontSize: 18 }}>{e}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="r-cost">필요한 별점: {cost} ⭐</label>
            <input id="r-cost" type="range" min={50} max={2000} step={50} value={cost}
              onChange={(e) => setCost(Number(e.target.value))} className="range" />
          </div>
          <button type="button" className="btn primary block" disabled={!title.trim() || busy} onClick={save}>
            {busy ? '저장 중…' : '목표 정하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
