import { useState } from 'react'
import { Mascot } from '../components/Mascot'
import { lookupInvite, childLogin, ApiError, type Me, type JoinInfo } from '../auth/api'

export function ChildJoin({ onBack, onDone }: { onBack: () => void; onDone: (me: Me) => void }) {
  const [code, setCode] = useState('')
  const [info, setInfo] = useState<JoinInfo | null>(null)
  const [childId, setChildId] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const selectedChild = info?.children.find((c) => c.id === childId) ?? null

  async function findFamily() {
    setErr(null); setBusy(true)
    try {
      const res = await lookupInvite(code.trim().toUpperCase())
      setInfo(res)
      if (res.children.length === 0) setErr('아직 등록된 자녀가 없어요. 부모님께 물어보세요.')
    } catch {
      setErr('초대코드를 찾을 수 없어요. 다시 확인해 주세요.')
    } finally { setBusy(false) }
  }

  async function enter() {
    if (!childId || !info) return
    setErr(null); setBusy(true)
    try {
      const me = await childLogin({ inviteCode: code.trim().toUpperCase(), childId, pin: pin.trim() || undefined })
      onDone(me)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'invalid_pin') setErr('PIN이 맞지 않아요.')
      else setErr('입장에 실패했어요. 다시 시도해 주세요.')
    } finally { setBusy(false) }
  }

  return (
    <div className="onb">
      <div className="backrow">
        <button type="button" className="backbtn" onClick={info ? () => { setInfo(null); setChildId(null); setErr(null) } : onBack}>← 뒤로</button>
      </div>
      <div className="onb-hero">
        <div className="mw"><Mascot /></div>
        <h1>{info ? `${info.family.name}에 들어가기` : '초대코드를 입력해요'}</h1>
        <p>{info ? '누구인지 골라 주세요.' : '부모님이 알려준 코드를 넣어 주세요.'}</p>
      </div>

      <div className="form">
        {err && <div className="formerr">{err}</div>}

        {!info ? (
          <>
            <div className="field">
              <label htmlFor="j-code">초대코드</label>
              <input id="j-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder="예: 2N3GR5" style={{ letterSpacing: '.16em', fontWeight: 800, textAlign: 'center', fontSize: '20px' }} />
            </div>
            <button type="button" className="btn primary block" disabled={code.length < 4 || busy} onClick={findFamily}>
              {busy ? '찾는 중…' : '가족 찾기'}
            </button>
          </>
        ) : (
          <>
            <div className="pick-list">
              {info.children.map((c) => (
                <button type="button" key={c.id} className={`pick${childId === c.id ? ' on' : ''}`}
                  onClick={() => { setChildId(c.id); setPin(''); setErr(null) }}>
                  <span className="pav" aria-hidden="true">🌱</span>
                  <span className="pn">{c.name}</span>
                  {c.hasPin && <span className="lock" aria-hidden="true">🔒</span>}
                </button>
              ))}
            </div>

            {selectedChild?.hasPin && (
              <div className="field">
                <label htmlFor="j-pin">PIN 4자리</label>
                <input id="j-pin" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  inputMode="numeric" placeholder="••••" style={{ letterSpacing: '.3em', textAlign: 'center', fontSize: '20px' }} />
              </div>
            )}

            <button type="button" className="btn primary block"
              disabled={!childId || (!!selectedChild?.hasPin && pin.length < 4) || busy} onClick={enter}>
              {busy ? '입장 중…' : '입장하기 🎉'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
