import { useState } from 'react'
import { Mascot } from '../components/Mascot'
import { parentSignup, parentLogin, googleAuth, ApiError, type Me } from '../auth/api'
import { GoogleButton, googleEnabled } from '../components/GoogleButton'
import { googleMayBeBlocked } from '../lib/env'

type Mode = 'signup' | 'login'

export function ParentAuth({ onBack, onDone, initialMode = 'signup' }: { onBack: () => void; onDone: (me: Me) => void; initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [parentKind, setParentKind] = useState<'mom' | 'dad'>('mom')
  const [familyName, setFamilyName] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Google 신규 가입: 가족 이름을 한 단계 더 받는다
  const [googleCred, setGoogleCred] = useState<string | null>(null)

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
    if (!googleCred || !familyName.trim()) return
    setErr(null); setBusy(true)
    try {
      const res = await googleAuth(googleCred, familyName.trim(), parentKind)
      onDone(res)
    } catch { setErr('가족 만들기에 실패했어요. 다시 시도해 주세요.') }
    finally { setBusy(false) }
  }

  // Google 신규 사용자 → 가족 이름 단계
  if (googleCred) {
    return (
      <div className="onb">
        <div className="backrow"><button type="button" className="backbtn" onClick={() => setGoogleCred(null)}>← 뒤로</button></div>
        <div className="onb-hero">
          <div className="mw"><Mascot /></div>
          <h1>거의 다 됐어요!</h1>
          <p>{name ? `${name}님, ` : ''}우리 가족 이름만 정해 주세요.</p>
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
          <div className="field">
            <label htmlFor="g-fam">우리 가족 이름</label>
            <input id="g-fam" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="예: 지우네" maxLength={20} autoFocus />
          </div>
          <button type="button" className="btn primary block" disabled={!familyName.trim() || busy} onClick={finishGoogleSignup}>
            {busy ? '만드는 중…' : '가족 만들기'}
          </button>
        </div>
      </div>
    )
  }

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
  const canSignup = emailOk && password.length >= 6 && name.trim() && familyName.trim() && !busy
  const canLogin = emailOk && password.length >= 6 && !busy

  async function submit() {
    setErr(null); setBusy(true)
    try {
      const me = mode === 'signup'
        ? await parentSignup({ email: email.trim(), password, name: name.trim(), parentKind, familyName: familyName.trim() })
        : await parentLogin({ email: email.trim(), password })
      onDone(me)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'email_taken') setErr('이미 가입된 이메일이에요. 로그인해 주세요.')
      else if (e instanceof ApiError && e.code === 'invalid_credentials') setErr('이메일 또는 비밀번호가 맞지 않아요.')
      else if (e instanceof ApiError && e.code === 'weak_password') setErr('비밀번호는 6자 이상이어야 해요.')
      else setErr('문제가 생겼어요. 다시 시도해 주세요.')
    } finally { setBusy(false) }
  }

  return (
    <div className="onb">
      <div className="backrow"><button type="button" className="backbtn" onClick={onBack}>← 뒤로</button></div>
      <div className="onb-hero">
        <div className="mw"><Mascot /></div>
        <h1>{mode === 'signup' ? '부모님, 시작해요' : '다시 오셨네요'}</h1>
        <p>{mode === 'signup' ? '가족을 만들고 자녀를 초대할 수 있어요.' : '이메일로 로그인하세요.'}</p>
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
            <div className="field">
              <label htmlFor="p-fam">우리 가족 이름</label>
              <input id="p-fam" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="예: 지우네" maxLength={20} />
            </div>
          </>
        )}

        <button type="button" className="btn primary block" disabled={mode === 'signup' ? !canSignup : !canLogin} onClick={submit}>
          {busy ? '잠시만요…' : mode === 'signup' ? '가족 만들기' : '로그인'}
        </button>

        <div style={{ textAlign: 'center' }}>
          <button type="button" className="linkbtn" onClick={() => { setErr(null); setMode(mode === 'signup' ? 'login' : 'signup') }}>
            {mode === 'signup' ? '이미 계정이 있어요 · 로그인' : '처음이에요 · 가족 만들기'}
          </button>
        </div>
      </div>
    </div>
  )
}
