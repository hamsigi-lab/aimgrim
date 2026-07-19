import { useState } from 'react'
import { Mascot } from '../components/Mascot'
import { resetPassword } from '../auth/api'

/** 비밀번호 재설정 화면 — 이메일 링크(/reset?token=...)로 진입 */
export function ResetPassword() {
  const token = new URLSearchParams(window.location.search).get('token') ?? ''
  const [pw, setPw] = useState('')
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (pw.length < 6) { setErr('비밀번호는 6자 이상이어야 해요.'); return }
    setBusy(true); setErr(null)
    try { await resetPassword(token, pw); setDone(true) }
    catch { setErr('링크가 만료되었거나 올바르지 않아요. 다시 요청해 주세요.'); setBusy(false) }
  }

  return (
    <div className="app">
      <div className="onb">
        <div className="onb-hero"><div className="mw"><Mascot /></div><h1>비밀번호 재설정</h1></div>
        <div className="form">
          {done ? (
            <>
              <p className="hint" style={{ textAlign: 'center' }}>새 비밀번호로 바꿨어요! 이제 로그인해 주세요 🎉</p>
              <a className="btn primary block" href="/" style={{ textAlign: 'center', textDecoration: 'none' }}>로그인하러 가기</a>
            </>
          ) : !token ? (
            <p className="hint" style={{ textAlign: 'center' }}>링크가 올바르지 않아요. 다시 요청해 주세요.</p>
          ) : (
            <>
              {err && <div className="formerr">{err}</div>}
              <div className="field">
                <label htmlFor="rp">새 비밀번호</label>
                <input id="rp" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="6자 이상" autoComplete="new-password" />
              </div>
              <button type="button" className="btn primary block" disabled={busy || pw.length < 6} onClick={submit}>{busy ? '변경 중…' : '비밀번호 바꾸기'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
