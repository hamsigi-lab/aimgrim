import { useState } from 'react'
import { createEncouragement } from '../api'

const QUICK = ['오늘도 잘하고 있어! 💪', '스스로 해내는 네가 멋져 😊', '조금만 더 힘내자 ✨', '정말 자랑스러워 🥰']

export function EncourageComposer({ childId, onClose, onSaved }: { childId: string; onClose: () => void; onSaved: () => void }) {
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function send() {
    if (!msg.trim()) return
    setBusy(true); setErr(null)
    try { await createEncouragement(childId, msg.trim()); onSaved(); onClose() }
    catch { setErr('전송에 실패했어요.'); setBusy(false) }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="격려 보내기">
        <div className="grip" />
        <h3>격려 한마디 💛</h3>
        <p className="sub">아이에게 따뜻한 말을 남겨보세요.</p>
        <div className="form">
          {err && <div className="formerr">{err}</div>}
          <div className="child-switch" style={{ marginBottom: 4 }}>
            {QUICK.map((q) => (
              <button type="button" key={q} onClick={() => setMsg(q)}>{q}</button>
            ))}
          </div>
          <textarea className="msg-input" value={msg} onChange={(e) => setMsg(e.target.value)}
            placeholder="직접 쓰거나 위에서 골라 주세요" maxLength={200} />
          <button type="button" className="btn primary block" disabled={!msg.trim() || busy} onClick={send}>
            {busy ? '보내는 중…' : '보내기'}
          </button>
        </div>
      </div>
    </div>
  )
}
