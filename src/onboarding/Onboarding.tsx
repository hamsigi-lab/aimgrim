import { useState } from 'react'
import { Mascot } from '../components/Mascot'
import { useAuth } from '../auth/AuthProvider'
import { ParentAuth } from './ParentAuth'
import { ChildJoin } from './ChildJoin'

type Step = 'welcome' | 'parent' | 'login' | 'child'

export function Onboarding() {
  const { setMe, enterDemo } = useAuth()
  const [step, setStep] = useState<Step>('welcome')

  if (step === 'parent') return <ParentAuth onBack={() => setStep('welcome')} onDone={setMe} initialMode="signup" />
  if (step === 'login') return <ParentAuth onBack={() => setStep('welcome')} onDone={setMe} initialMode="login" />
  if (step === 'child') return <ChildJoin onBack={() => setStep('welcome')} onDone={setMe} />

  return (
    <div className="onb">
      <div className="grow" />
      <div className="onb-hero">
        <div className="mw"><Mascot /></div>
        <div className="onb-brand">🌱 aimgrim</div>
        <h1>우리 가족 하루 계획,<br />함께 그려요</h1>
        <p>매일 계획을 함께 세우고, 해내면 별점이 쌓여요.<br />자녀가 원하는 목표까지 한 걸음씩.</p>
      </div>
      <div className="grow" />
      <div className="stack-btns">
        <button type="button" className="btn primary block" onClick={() => setStep('parent')}>부모로 시작하기</button>
        <button type="button" className="btn ghost block" onClick={() => setStep('child')}>자녀로 참여하기</button>
        <div style={{ textAlign: 'center', marginTop: 2 }}>
          <button type="button" className="linkbtn" onClick={() => setStep('login')}>이미 계정이 있어요 · 로그인</button>
        </div>
        <div style={{ textAlign: 'center' }}>
          <button type="button" className="linkbtn" style={{ color: 'var(--ink-faint)' }} onClick={enterDemo}>먼저 둘러보기 (체험) →</button>
        </div>
      </div>
    </div>
  )
}
