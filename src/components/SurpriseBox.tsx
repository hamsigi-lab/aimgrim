import { useState } from 'react'
import { Mascot } from './Mascot'
import type { Surprise } from '../api'

/** 깜짝 상자 — 하루 계획을 다 해낸 날 가끔 나타나는 상징 보상.
 * 슬롯머신 연출(확률판·희귀도·재도전) 없이, 조용히 열어 보너스를 받는 형태. */
export function SurpriseBox({ surprise, onClose }: { surprise: Surprise; onClose: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="sheet-backdrop sb-backdrop" onClick={open ? onClose : undefined}>
      <div className="sb-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="깜짝 선물">
        {!open ? (
          <>
            <div className="sb-lab">오늘 계획을 다 해냈어요!</div>
            <button type="button" className="sb-box" onClick={() => setOpen(true)} aria-label="선물 상자 열기">🎁</button>
            <div className="sb-hint">탭해서 열어보세요</div>
          </>
        ) : (
          <>
            <div className="sb-mascot"><Mascot size={104} /></div>
            <div className="sb-reward">+{surprise.points} ⭐</div>
            <div className="sb-msg">{surprise.message}</div>
            <button type="button" className="btn primary block" onClick={onClose}>받기 🎉</button>
          </>
        )}
      </div>
    </div>
  )
}
