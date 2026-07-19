import { useState } from 'react'
import { Mascot } from '../components/Mascot'
import { useAuth } from '../auth/AuthProvider'
import { ParentAuth } from './ParentAuth'
import { StudentAuth } from './StudentAuth'
import { ChildJoin } from './ChildJoin'

type Step = 'welcome' | 'parent' | 'student' | 'login' | 'child'

export function Onboarding() {
  const { setMe, enterDemo } = useAuth()
  const [step, setStep] = useState<Step>('welcome')

  if (step === 'parent') return <ParentAuth onBack={() => setStep('welcome')} onDone={setMe} initialMode="signup" />
  if (step === 'student') return <StudentAuth onBack={() => setStep('welcome')} onDone={setMe} onGoFamily={() => setStep('parent')} />
  if (step === 'login') return <ParentAuth onBack={() => setStep('welcome')} onDone={setMe} initialMode="login" />
  if (step === 'child') return <ChildJoin onBack={() => setStep('welcome')} onDone={setMe} />

  return (
    <div className="onb">
      <div className="grow" />
      <div className="onb-hero">
        <div className="mw"><Mascot /></div>
        <div className="onb-brand">🌱 aimgrim</div>
        <h1>하루 계획, 목표,<br />순공까지 한 걸음씩</h1>
        <p>부모님과 함께, 또는 나 혼자 자기주도로.<br />해내면 별점이 쌓여요.</p>
      </div>
      <div className="grow" />
      <div className="stack-btns">
        <button type="button" className="btn primary block" onClick={() => setStep('parent')}>👨‍👩‍👧 부모님과 함께 시작</button>
        <button type="button" className="btn primary block" onClick={() => setStep('student')}>🧑‍🎓 나 혼자 시작 (자기주도)</button>
        <button type="button" className="btn ghost block" onClick={() => setStep('child')}>초대코드로 자녀 참여</button>
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
