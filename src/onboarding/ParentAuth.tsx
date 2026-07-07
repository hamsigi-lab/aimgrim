import { useState } from 'react'
import { Mascot } from '../components/Mascot'
import { parentSignup, parentJoin, parentLogin, googleAuth, ApiError, type Me } from '../auth/api'
import { GoogleButton, googleEnabled } from '../components/GoogleButton'
import { googleMayBeBlocked } from '../lib/env'

type Mode = 'signup' | 'login'
type FamMode = 'new' | 'join'

export function ParentAuth({ onBack, onDone, initialMode = 'signup' }: { onBack: () => void; onDone: (me: Me) => void; initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [famMode, setFamMode] = useState<FamMode>('new')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [parentKind, setParentKind] = useState<'mom' | 'dad'>('mom')
  const [familyName, setFamilyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [googleCred, setGoogleCred] = useState<string | null>(null)

  const codeClean = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)

  async function handleGoogle(credential: string) {
    setErr(null); setBusy(true)
    try {
      const res = await googleAuth(credential)
      if (res.needsFamily) { setGoogleCred(credential); if (res.name) setName(res.name) }
      else onDone(res)
    } catch { setErr('Google 로그인에 문제가 생겼어요. 다시 시도해 주세요.') }
    finally { setBusy(false) }
  }

  async function finishGoogleSignup() {
    if (!googleCred) return
    if (famMode === 'new' ? !familyName.trim() : inviteCode.length < 4) return
    setErr(null); setBusy(true)
    try {
      const res = famMode === 'new'
        ? await googleAuth(googleCred, { familyName: familyName.trim(), parentKind })
        : await googleAuth(googleCred, { inviteCode, parentKind })
      onDone(res)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'invalid_code') setErr('초대코드를 찾을 수 없어요. 다시 확인해 주세요.')
      else setErr('가족 연결에 실패했어요. 다시 시도해 주세요.')
    } finally { setBusy(false) }
  }

  function FamModePicker() {
    return (
      <div className="field">
        <label>가족</label>
        <div className="seg">
          <button type="button" className={famMode === 'new' ? 'on' : ''} onClick={() => setFamMode('new')}>새 가족 만들기</button>
          <button type="button" className={famMode === 'join' ? 'on' : ''} onClick={() => setFamMode('join')}>기존 가족 참여</button>
        </div>
      </div>
    )
  }
  function FamFields() {
    return famMode === 'new' ? (
      <div className="field">
        <label htmlFor="p-fam">우리 가족 이름</label>
        <input id="p-fam" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="예: 지우네" maxLength={20} />
      </div>
    ) : (
      <div className="field">
        <label htmlFor="p-code">가족 초대코드</label>
        <input id="p-code" value={inviteCode} onChange={(e) => setInviteCode(codeClean(e.target.value))}
          placeholder="배우자에게 받은 코드" style={{ letterSpacing: '.14em', fontWeight: 800, textAlign: 'center' }} />
        <span className="hint">먼저 가입한 분의 메뉴(⋯)에서 초대코드를 확인할 수 있어요.</span>
      </div>
    )
  }

  // Google 신규 사용자 → 가족 만들기/참여 단계
  if (googleCred) {
    const ok = famMode === 'new' ? !!familyName.trim() : inviteCode.length >= 4
    return (
      <div className="onb">
        <div className="backrow"><button type="button" className="backbtn" onClick={() => setGoogleCred(null)}>← 뒤로</button></div>
        <div className="onb-hero">
          <div className="mw"><Mascot /></div>
          <h1>거의 다 됐어요!</h1>
          <p>{name ? `${name}님, ` : ''}새 가족을 만들거나 기존 가족에 참여하세요.</p>
        </div>
        <div className="form">
          {err && <div className="formerr">{err}</div>}
          <div className="field">
            <label>나는</label>
            <div className="seg">
              <button type="button" className={parentKind === 'mom' ? 'on' : ''} onClick={() => setParentKind('mom')}>엄마</button>
              <button type="button" className={parentKind === 'dad' ? 'on' : ''} onClick={() => setParentKind('dad')}>아빠</button>
            </div>
          </div>
          {FamModePicker()}
          {FamFields()}
          <button type="button" className="btn primary block" disabled={!ok || busy} onClick={finishGoogleSignup}>
            {busy ? '잠시만요…' : famMode === 'new' ? '가족 만들기' : '가족에 참여하기'}
          </button>
        </div>
      </div>
    )
  }

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
  const famOk = famMode === 'new' ? !!familyName.trim() : inviteCode.length >= 4
  const canSignup = emailOk && password.length >= 6 && !!name.trim() && famOk && !busy
  const canLogin = emailOk && password.length >= 6 && !busy

  async function submit() {
    setErr(null); setBusy(true)
    try {
      let me: Me
      if (mode === 'login') me = await parentLogin({ email: email.trim(), password })
      else if (famMode === 'new') me = await parentSignup({ email: email.trim(), password, name: name.trim(), parentKind, familyName: familyName.trim() })
      else me = await parentJoin({ email: email.trim(), password, name: name.trim(), parentKind, inviteCode })
      onDone(me)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'email_taken') setErr('이미 가입된 이메일이에요. 로그인해 주세요.')
      else if (e instanceof ApiError && e.code === 'invalid_credentials') setErr('이메일 또는 비밀번호가 맞지 않아요.')
      else if (e instanceof ApiError && e.code === 'weak_password') setErr('비밀번호는 6자 이상이어야 해요.')
      else if (e instanceof ApiError && e.code === 'invalid_code') setErr('초대코드를 찾을 수 없어요. 다시 확인해 주세요.')
      else setErr('문제가 생겼어요. 다시 시도해 주세요.')
    } finally { setBusy(false) }
  }

  return (
    <div className="onb">
      <div className="backrow"><button type="button" className="backbtn" onClick={onBack}>← 뒤로</button></div>
      <div className="onb-hero">
        <div className="mw"><Mascot /></div>
        <h1>{mode === 'signup' ? '부모님, 시작해요' : '다시 오셨네요'}</h1>
        <p>{mode === 'signup' ? '새 가족을 만들거나, 배우자의 가족에 참여할 수 있어요.' : '이메일로 로그인하세요.'}</p>
      </div>

      <div className="form">
        {err && <div className="formerr">{err}</div>}

        {googleEnabled && (
          <>
            {googleMayBeBlocked() && (
              <div className="inapp-note">
                📢 지금은 <b>앱 속 브라우저</b>(카톡 등)예요. Google 로그인이 막힐 수 있어요.
                <br />오른쪽 위 메뉴로 <b>Safari·Chrome에서 열거나</b>, 아래 <b>이메일</b>로 가입해 주세요.
              </div>
            )}
            <GoogleButton onCredential={handleGoogle} />
            <div className="or-div"><span>또는 이메일로</span></div>
          </>
        )}

        <div className="field">
          <label htmlFor="p-email">이메일</label>
          <input id="p-email" type="email" autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="parent@example.com" />
        </div>
        <div className="field">
          <label htmlFor="p-pw">비밀번호</label>
          <input id="p-pw" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6자 이상" />
        </div>

        {mode === 'signup' && (
          <>
            <div className="field">
              <label htmlFor="p-name">내 이름/호칭</label>
              <input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 엄마, 아빠, 지우 엄마" maxLength={20} />
            </div>
            <div className="field">
              <label>나는</label>
              <div className="seg">
                <button type="button" className={parentKind === 'mom' ? 'on' : ''} onClick={() => setParentKind('mom')}>엄마</button>
                <button type="button" className={parentKind === 'dad' ? 'on' : ''} onClick={() => setParentKind('dad')}>아빠</button>
              </div>
            </div>
            {FamModePicker()}
            {FamFields()}
          </>
        )}

        <button type="button" className="btn primary block" disabled={mode === 'signup' ? !canSignup : !canLogin} onClick={submit}>
          {busy ? '잠시만요…' : mode === 'login' ? '로그인' : famMode === 'new' ? '가족 만들기' : '가족에 참여하기'}
        </button>

        <div style={{ textAlign: 'center' }}>
          <button type="button" className="linkbtn" onClick={() => { setErr(null); setMode(mode === 'signup' ? 'login' : 'signup') }}>
            {mode === 'signup' ? '이미 계정이 있어요 · 로그인' : '처음이에요 · 가족 시작하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
