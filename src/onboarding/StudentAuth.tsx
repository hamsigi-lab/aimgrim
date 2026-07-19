import { useState } from 'react'
import { Mascot } from '../components/Mascot'
import { studentSignup, googleAuth, ApiError, type Me } from '../auth/api'
import { GoogleButton, googleEnabled } from '../components/GoogleButton'

const CURRENT_YEAR = new Date().getFullYear()

/** 학생 혼자(자기주도) 가입 — 만 14세 이상. 이메일 또는 구글 계정. 14세 미만이면 부모와 함께로 안내. */
export function StudentAuth({ onBack, onDone, onGoFamily }: { onBack: () => void; onDone: (me: Me) => void; onGoFamily: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [consent, setConsent] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [tooYoung, setTooYoung] = useState(false)
  const [busy, setBusy] = useState(false)
  const [googleCred, setGoogleCred] = useState<string | null>(null)

  const yearNum = Number(birthYear)
  const validYear = /^\d{4}$/.test(birthYear) && yearNum >= 1990 && yearNum <= CURRENT_YEAR
  const age = validYear ? CURRENT_YEAR - yearNum : null
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
  const infoOk = name.trim().length > 0 && validYear && consent
  const canSubmit = emailOk && password.length >= 6 && infoOk && !busy

  function handleErr(e: unknown) {
    if (e instanceof ApiError && e.code === 'too_young') setTooYoung(true)
    else if (e instanceof ApiError && e.code === 'email_taken') setErr('이미 가입된 이메일이에요. 로그인해 주세요.')
    else if (e instanceof ApiError && e.code === 'weak_password') setErr('비밀번호는 6자 이상이어야 해요.')
    else setErr('문제가 생겼어요. 다시 시도해 주세요.')
  }

  async function submit() {
    setErr(null); setTooYoung(false); setBusy(true)
    try { onDone(await studentSignup({ email: email.trim(), password, name: name.trim(), birthYear: yearNum, consent })) }
    catch (e) { handleErr(e) } finally { setBusy(false) }
  }

  async function handleGoogle(credential: string) {
    setErr(null); setTooYoung(false); setBusy(true)
    try {
      const res = await googleAuth(credential, { mode: 'student', birthYear: validYear ? yearNum : undefined, consent, name: name.trim() || undefined })
      if (res.needsStudentInfo) { setGoogleCred(credential); if (res.name && !name) setName(res.name) }
      else onDone(res)
    } catch (e) { handleErr(e) } finally { setBusy(false) }
  }
  async function finishGoogle() {
    if (!googleCred || !infoOk) return
    setErr(null); setTooYoung(false); setBusy(true)
    try {
      const res = await googleAuth(googleCred, { mode: 'student', birthYear: yearNum, consent, name: name.trim() })
      if (res.needsStudentInfo) setErr('태어난 해와 동의를 확인해 주세요.')
      else onDone(res)
    } catch (e) { handleErr(e) } finally { setBusy(false) }
  }

  const ageHint = age != null && <span className="hint">만 {age}세{age < 14 ? ' · 혼자 가입은 만 14세 이상이에요' : ''}</span>
  const consentBox = (
    <label className="consent">
      <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
      <span className="ctxt">
        내 최소 정보(별명·태어난 해)를 아임그림이 처리하는 것과{' '}
        <a href="/privacy" target="_blank" rel="noreferrer">개인정보 처리방침</a>에 <b>동의합니다.</b>
      </span>
    </label>
  )

  // 구글 인증 후 — 생년·동의만 받으면 끝
  if (googleCred) {
    return (
      <div className="onb">
        <div className="backrow"><button type="button" className="backbtn" onClick={() => setGoogleCred(null)}>← 뒤로</button></div>
        <div className="onb-hero"><div className="mw"><Mascot /></div><h1>거의 다 됐어요!</h1><p>태어난 해와 동의만 확인하면 시작해요.</p></div>
        <div className="form">
          {err && <div className="formerr">{err}</div>}
          {tooYoung && <div className="inapp-note">🌱 만 14세 미만은 <b>부모님과 함께</b> 시작해요. <div style={{ marginTop: 8 }}><button type="button" className="btn primary block" onClick={onGoFamily}>부모님과 함께하기로 가기</button></div></div>}
          <div className="field"><label htmlFor="sg-name">별명</label><input id="sg-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 그림" maxLength={20} /></div>
          <div className="field"><label htmlFor="sg-year">태어난 해</label><input id="sg-year" value={birthYear} onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="예: 2010" />{ageHint}</div>
          {consentBox}
          <button type="button" className="btn primary block" disabled={!infoOk || busy} onClick={finishGoogle}>{busy ? '시작하는 중…' : 'Google로 시작하기'}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="onb">
      <div className="backrow"><button type="button" className="backbtn" onClick={onBack}>← 뒤로</button></div>
      <div className="onb-hero">
        <div className="mw"><Mascot /></div>
        <h1>나 혼자, 자기주도 🧑‍🎓</h1>
        <p>내 목표와 계획을 스스로 세우고 관리해요. 순공시간·별점도 나만의 기록으로.</p>
      </div>

      <div className="form">
        {err && <div className="formerr">{err}</div>}
        {tooYoung && (
          <div className="inapp-note">
            🌱 만 14세 미만은 <b>부모님과 함께</b> 시작해요(개인정보 보호). 부모님 계정으로 함께해도 똑같이 스스로 관리할 수 있어요.
            <div style={{ marginTop: 8 }}><button type="button" className="btn primary block" onClick={onGoFamily}>부모님과 함께하기로 가기</button></div>
          </div>
        )}

        {googleEnabled && (
          <>
            <GoogleButton onCredential={handleGoogle} />
            <div className="or-div"><span>또는 이메일로</span></div>
          </>
        )}

        <div className="field">
          <label htmlFor="s-email">이메일</label>
          <input id="s-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="me@example.com" />
        </div>
        <div className="field">
          <label htmlFor="s-pw">비밀번호</label>
          <input id="s-pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6자 이상" />
        </div>
        <div className="field">
          <label htmlFor="s-name">별명</label>
          <input id="s-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 그림 (실명 대신 별명 권장)" maxLength={20} />
        </div>
        <div className="field">
          <label htmlFor="s-year">태어난 해</label>
          <input id="s-year" value={birthYear} onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="예: 2010" />
          {ageHint}
        </div>
        {consentBox}
        <button type="button" className="btn primary block" disabled={!canSubmit} onClick={submit}>{busy ? '시작하는 중…' : '나 혼자 시작하기'}</button>
      </div>
    </div>
  )
}
