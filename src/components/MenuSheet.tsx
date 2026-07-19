import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { AddChildForm } from '../onboarding/AddChildForm'
import { exportMyData, deleteAccount } from '../auth/api'

export function MenuSheet({ onClose }: { onClose: () => void }) {
  const { me, activeChildId, setActiveChild, setMe, logout } = useAuth()
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  if (!me?.authenticated) return null

  async function doExport() { setBusy(true); try { await exportMyData() } catch { alert('내보내기에 실패했어요.') } finally { setBusy(false) } }
  async function doDelete() {
    const fam = me?.family?.name ?? '우리 가족'
    if (!window.confirm(`정말 '${fam}'의 모든 데이터(자녀 기록 포함)를 영구 삭제할까요?\n되돌릴 수 없어요. 먼저 '데이터 내보내기'로 백업을 권해요.`)) return
    if (!window.confirm('마지막 확인이에요. 정말 삭제할까요?')) return
    setBusy(true)
    try { await deleteAccount(); logout() } catch { alert('삭제에 실패했어요.'); setBusy(false) }
  }

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

        {isParent && (
          <div className="sheet-row">
            <span className="rl">내 데이터</span>
            <button type="button" className="btn ghost sm" disabled={busy} onClick={doExport}>내보내기</button>
          </div>
        )}

        <div className="sheet-row">
          <span className="rl">로그아웃</span>
          <button type="button" className="btn ghost sm" onClick={() => { logout(); onClose() }}>로그아웃</button>
        </div>

        {isParent && (
          <div className="sheet-row" style={{ justifyContent: 'flex-end', borderTop: 'none', paddingTop: 2 }}>
            <button type="button" className="linkbtn" style={{ color: 'var(--crit)' }} disabled={busy} onClick={doDelete}>계정·가족 삭제</button>
          </div>
        )}

        <div className="sheet-row" style={{ justifyContent: 'center', gap: 14, borderTop: 'none', paddingTop: 4 }}>
          <a href="/privacy" target="_blank" rel="noreferrer" className="legal-link">개인정보 처리방침</a>
          <a href="/terms" target="_blank" rel="noreferrer" className="legal-link">이용약관</a>
        </div>
      </div>
    </div>
  )
}
