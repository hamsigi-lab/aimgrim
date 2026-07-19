import { useState } from 'react'
import { addChild, ApiError, type Me } from '../auth/api'

const CONSENT_AGE = 14
const CURRENT_YEAR = new Date().getFullYear()

export function AddChildForm({ onDone, submitLabel = '자녀 추가하기' }: { onDone: (me: Me) => void; submitLabel?: string }) {
  const [name, setName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [pin, setPin] = useState('')
  const [consent, setConsent] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const yearNum = Number(birthYear)
  const validYear = /^\d{4}$/.test(birthYear) && yearNum >= 1990 && yearNum <= CURRENT_YEAR
  const age = validYear ? CURRENT_YEAR - yearNum : null
  const needsConsent = age != null && age < CONSENT_AGE
  // 부모가 직접 등록하는 구조 — 동의 체크로 법정대리인 동의를 갈음(별도 본인인증 불필요)
  const canSubmit = name.trim().length > 0 && validYear && consent && !busy

  async function submit() {
    setErr(null); setBusy(true)
    try {
      const me = await addChild({ name: name.trim(), birthYear: yearNum, consent, pin: pin.trim() || undefined })
      onDone(me)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'consent_required') setErr('만 14세 미만은 법정대리인 동의가 필요해요.')
      else if (e instanceof ApiError && e.code === 'invalid_birth_year') setErr('태어난 해를 확인해 주세요.')
      else setErr('추가에 실패했어요. 다시 시도해 주세요.')
    } finally { setBusy(false) }
  }

  return (
    <div className="form">
      {err && <div className="formerr">{err}</div>}
      <div className="field">
        <label htmlFor="c-name">자녀 별명</label>
        <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 지우 (실명 대신 별명을 권장해요)" maxLength={20} />
        <span className="hint">개인정보 최소 수집을 위해 <b>실명보다 별명</b>을 권장해요.</span>
      </div>
      <div className="field">
        <label htmlFor="c-year">태어난 해</label>
        <input id="c-year" value={birthYear} onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
          inputMode="numeric" placeholder="예: 2013" />
        {age != null && <span className="hint">만 {age}세{needsConsent ? ' · 법정대리인 동의 필요' : ''}</span>}
      </div>
      <div className="field">
        <label htmlFor="c-pin">잠금 PIN (선택 · 숫자 4자리)</label>
        <input id="c-pin" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          inputMode="numeric" placeholder="자녀만 입장하도록 (비워도 돼요)" />
      </div>

      <label className="consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span className="ctxt">
          저는 이 자녀의 <b>법정대리인(부모)</b>이며, 자녀의 최소 정보(별명·태어난 해)를 아임그림이 처리하는 것과{' '}
          <a href="/privacy" target="_blank" rel="noreferrer">개인정보 처리방침</a>에 <b>동의합니다.</b>
          {needsConsent && <><br /><span className="hint" style={{ margin: 0 }}>만 14세 미만 — 법정대리인 동의 (개인정보 보호법 §22조의2)</span></>}
        </span>
      </label>

      <button type="button" className="btn primary block" disabled={!canSubmit} onClick={submit}>
        {busy ? '추가하는 중…' : submitLabel}
      </button>
    </div>
  )
}
