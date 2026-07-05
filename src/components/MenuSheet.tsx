import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { AddChildForm } from '../onboarding/AddChildForm'

export function MenuSheet({ onClose }: { onClose: () => void }) {
  const { me, activeChildId, setActiveChild, setMe, logout } = useAuth()
  const [adding, setAdding] = useState(false)
  if (!me?.authenticated) return null

  const isParent = me.member?.role === 'parent'
  const roleLabel = isParent ? (me.member?.parentKind === 'dad' ? '아빠' : '엄마') : '자녀'

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="메뉴">
        <div className="grip" />
        <h3>{me.family?.name}</h3>
        <p className="sub">{me.member?.name} · {roleLabel}</p>

        {isParent && me.family && (
          <div className="sheet-row">
            <span className="rl">초대코드</span>
            <span className="rv" style={{ letterSpacing: '.12em', fontFamily: 'var(--round)' }}>{me.family.inviteCode}</span>
          </div>
        )}

        {isParent && me.children && me.children.length > 0 && (
          <div className="sheet-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
            <span className="rl">자녀 보기</span>
            <div className="child-switch">
              {me.children.map((c) => (
                <button type="button" key={c.id} className={activeChildId === c.id ? 'on' : ''}
                  onClick={() => { setActiveChild(c.id); onClose() }}>{c.name}</button>
              ))}
            </div>
          </div>
        )}

        {isParent && (
          adding ? (
            <div style={{ paddingTop: 8 }}>
              <AddChildForm onDone={(next) => { setMe(next); setAdding(false); onClose() }} />
            </div>
          ) : (
            <div className="sheet-row">
              <span className="rl">자녀 추가</span>
              <button type="button" className="btn ghost sm" onClick={() => setAdding(true)}>+ 추가</button>
            </div>
          )
        )}

        <div className="sheet-row">
          <span className="rl">로그아웃</span>
          <button type="button" className="btn ghost sm" onClick={() => { logout(); onClose() }}>로그아웃</button>
        </div>
      </div>
    </div>
  )
}
