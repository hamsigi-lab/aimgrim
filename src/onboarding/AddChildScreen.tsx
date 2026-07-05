import { useAuth } from '../auth/AuthProvider'
import { AddChildForm } from './AddChildForm'

/** 부모가 가입 직후, 아직 자녀가 없을 때 — 초대코드 안내 + 첫 자녀 추가 */
export function AddChildScreen() {
  const { me, setMe, logout } = useAuth()
  const inviteCode = me?.family?.inviteCode

  return (
    <div className="onb">
      <div className="onb-hero">
        <div className="onb-brand">🌱 {me?.family?.name}</div>
        <h1>자녀를 추가해요</h1>
        <p>자녀 정보를 등록하면 함께 하루 계획을 세울 수 있어요.</p>
      </div>

      {inviteCode && (
        <div className="invite-box">
          <div className="lab">우리 가족 초대코드</div>
          <div className="code">{inviteCode}</div>
          <div className="desc">자녀가 자기 폰에서 <b>‘자녀로 참여하기’</b>로 이 코드를 넣으면 입장해요</div>
        </div>
      )}

      <AddChildForm onDone={setMe} submitLabel="자녀 추가하고 시작하기" />

      <div className="onb-foot">
        <button type="button" className="linkbtn" onClick={logout}>로그아웃</button>
      </div>
    </div>
  )
}
