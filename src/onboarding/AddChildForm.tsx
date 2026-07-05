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
  const canSubmit = name.trim().length > 0 && validYear && (!needsConsent || consent) && !busy

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
        <label htmlFor="c-name">자녀 이름 (또는 별명)</label>
        <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 지우" maxLength={20} />
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

      {needsConsent && (
        <label className="consent">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span className="ctxt">
            저는 이 자녀의 <b>법정대리인(부모)</b>이며, 자녀의 개인정보(이름·일정)를 aimgrim이 처리하는 것에 <b>동의합니다.</b>
            <br />(개인정보 보호법 제22조의2 — 만 14세 미만 아동)
          </span>
        </label>
      )}

      <button type="button" className="btn primary block" disabled={!canSubmit} onClick={submit}>
        {busy ? '추가하는 중…' : submitLabel}
      </button>
    </div>
  )
}
