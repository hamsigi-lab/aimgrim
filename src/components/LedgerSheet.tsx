import { useEffect, useState } from 'react'
import { getLedger, type LedgerEntry } from '../api'

function reasonLabel(e: LedgerEntry): string {
  if (e.note) return e.note
  switch (e.reason) {
    case 'task_done': return '할일 완료'
    case 'task_undone': return '완료 취소'
    case 'reward_redeem': return '보상 교환'
    default: return '별점 변동'
  }
}

export function LedgerSheet({ childId, onClose }: { childId: string; onClose: () => void }) {
  const [entries, setEntries] = useState<LedgerEntry[] | null>(null)

  useEffect(() => {
    getLedger(childId).then((r) => setEntries(r.entries)).catch(() => setEntries([]))
  }, [childId])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="별점 내역">
        <div className="grip" />
        <h3>별점 내역 ⭐</h3>
        <p className="sub">별점이 오르고 내린 기록이에요.</p>
        {entries === null ? (
          <p className="empty-hint">불러오는 중…</p>
        ) : entries.length === 0 ? (
          <p className="empty-hint">아직 내역이 없어요.</p>
        ) : (
          <div className="ledger">
            {entries.map((e, i) => (
              <div className="ledger-row" key={i}>
                <span className="lg-ico" aria-hidden="true">{e.reason === 'reward_redeem' ? '🎁' : e.delta >= 0 ? '✅' : '↩️'}</span>
                <span className="lg-label">{reasonLabel(e)}</span>
                <span className={`lg-delta ${e.delta >= 0 ? 'pos' : 'neg'}`}>{e.delta >= 0 ? '+' : ''}{e.delta} ⭐</span>
              </div>
            ))}
          </div>
        )}
        <button type="button" className="btn ghost block" style={{ marginTop: 12 }} onClick={onClose}>닫기</button>
      </div>
    </div>
  )
}
