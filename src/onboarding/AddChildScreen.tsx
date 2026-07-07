import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { switchFamily, ApiError } from '../auth/api'
import { AddChildForm } from './AddChildForm'

/** 부모가 가입 직후, 아직 자녀가 없을 때 — 자녀 추가 또는 배우자 가족에 합류 */
export function AddChildScreen() {
  const { me, setMe, logout } = useAuth()
  const inviteCode = me?.family?.inviteCode
  const [joinMode, setJoinMode] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function join() {
    if (code.length < 4) return
    setBusy(true); setErr(null)
    try { setMe(await switchFamily(code)) }
    catch (e) {
      if (e instanceof ApiError && e.code === 'invalid_code') setErr('초대코드를 찾을 수 없어요. 다시 확인해 주세요.')
      else setErr('참여에 실패했어요. 다시 시도해 주세요.')
      setBusy(false)
    }
  }

  return (
    <div className="onb">
      <div className="onb-hero">
        <div className="onb-brand">🌱 {me?.family?.name}</div>
        <h1>{joinMode ? '배우자 가족에 참여' : '가족을 시작해요'}</h1>
        <p>{joinMode ? '배우자가 알려준 초대코드를 넣으면 같은 가족으로 합쳐져요.' : '자녀를 추가하거나, 배우자가 만든 가족에 참여하세요.'}</p>
      </div>

      {joinMode ? (
        <div className="form">
          {err && <div className="formerr">{err}</div>}
          <div className="field">
            <label htmlFor="jf-code">가족 초대코드</label>
            <input id="jf-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="배우자에게 받은 코드" style={{ letterSpacing: '.16em', fontWeight: 800, textAlign: 'center', fontSize: '20px' }} autoFocus />
            <span className="hint">먼저 가입한 분의 메뉴(⋯) → 초대코드에서 확인할 수 있어요.</span>
          </div>
          <button type="button" className="btn primary block" disabled={code.length < 4 || busy} onClick={join}>
            {busy ? '참여 중…' : '이 가족에 참여하기'}
          </button>
          <div style={{ textAlign: 'center' }}>
            <button type="button" className="linkbtn" onClick={() => { setJoinMode(false); setErr(null) }}>← 자녀 추가로 돌아가기</button>
          </div>
        </div>
      ) : (
        <>
          {inviteCode && (
            <div className="invite-box">
              <div className="lab">우리 가족 초대코드</div>
              <div className="code">{inviteCode}</div>
              <div className="desc">자녀가 자기 폰에서 <b>‘자녀로 참여하기’</b>로 이 코드를 넣으면 입장해요</div>
            </div>
          )}

          <AddChildForm onDone={setMe} submitLabel="자녀 추가하고 시작하기" />

          <div className="or-div" style={{ margin: '18px 0 10px' }}><span>또는</span></div>
          <button type="button" className="btn ghost block" onClick={() => setJoinMode(true)}>
            💑 배우자가 이미 가족을 만들었어요 (초대코드로 참여)
          </button>

          <div className="onb-foot">
            <button type="button" className="linkbtn" onClick={logout}>로그아웃</button>
          </div>
        </>
      )}
    </div>
  )
}
