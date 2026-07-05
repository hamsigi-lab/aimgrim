import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { getOverview, type ChildOverview } from '../api'
import { Mascot } from '../components/Mascot'
import { MenuSheet } from '../components/MenuSheet'
import { AddChildForm } from '../onboarding/AddChildForm'

export function ParentHome() {
  const { me, setActiveChild, setMe, familyId } = useAuth()
  const [overview, setOverview] = useState<ChildOverview[] | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [adding, setAdding] = useState(false)

  const load = () => { if (familyId) getOverview(familyId).then((r) => setOverview(r.children)).catch(() => setOverview([])) }
  useEffect(load, [familyId])

  const parentName = me?.member?.name ?? '부모'
  const inviteCode = me?.family?.inviteCode

  return (
    <div className="app">
      <header className="appbar">
        <div className="hi">
          <div className="greet">오늘도 함께 응원해요 💛</div>
          <div className="name">{me?.family?.name}</div>
        </div>
        <button type="button" className="menu-btn" aria-label="메뉴" onClick={() => setMenuOpen(true)}>⋯</button>
      </header>

      <main className="body">
        <p className="ph-hello">안녕하세요, <b>{parentName}</b>님 👋<br />아이의 하루를 함께 만들어요.</p>

        {overview === null ? (
          <p className="empty-hint">불러오는 중…</p>
        ) : overview.length === 0 ? (
          <div className="ph-empty">
            <div className="mw" style={{ width: 96, height: 96, margin: '0 auto' }}><Mascot /></div>
            <p className="empty-hint">아직 등록된 자녀가 없어요.</p>
          </div>
        ) : (
          <div className="ph-cards">
            {overview.map((ch) => {
              const pct = ch.todayTotal > 0 ? Math.round((ch.todayDone / ch.todayTotal) * 100) : 0
              return (
                <button type="button" className="ph-card" key={ch.id} onClick={() => setActiveChild(ch.id)}>
                  <div className="ph-av" aria-hidden="true">🌱</div>
                  <div className="ph-mid">
                    <div className="ph-name">{ch.name}
                      {ch.pending > 0 && <span className="pending-badge">확인 {ch.pending}</span>}
                    </div>
                    <div className="ph-bar"><i style={{ width: `${pct}%` }} /></div>
                    <div className="ph-meta">오늘 {ch.todayDone}/{ch.todayTotal} 완료 · ⭐ {ch.points}</div>
                  </div>
                  <div className="ph-go" aria-hidden="true">›</div>
                </button>
              )
            })}
          </div>
        )}

        {inviteCode && (
          <div className="invite-box" style={{ marginTop: 18 }}>
            <div className="lab">우리 가족 초대코드</div>
            <div className="code">{inviteCode}</div>
            <div className="desc">자녀가 ‘자녀로 참여하기’에서 이 코드로 입장해요</div>
          </div>
        )}

        <div className="add-row" style={{ marginTop: 14 }}>
          <button type="button" className="add-btn" onClick={() => setAdding(true)}>＋ 자녀 추가</button>
        </div>
      </main>

      {menuOpen && <MenuSheet onClose={() => setMenuOpen(false)} />}
      {adding && (
        <div className="sheet-backdrop" onClick={() => setAdding(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="자녀 추가">
            <div className="grip" />
            <h3>자녀 추가</h3>
            <p className="sub">자녀 정보를 등록하면 함께 하루 계획을 세울 수 있어요.</p>
            <div style={{ marginTop: 8 }}>
              <AddChildForm onDone={(next) => { setMe(next); setAdding(false); load() }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
