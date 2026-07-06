// Google OAuth 클라이언트 ID (공개값). Google Cloud Console에서 발급 후 여기에 넣는다.
// 비어 있으면 'Google로 계속하기' 버튼이 숨겨진다(기존 이메일/비밀번호만 노출).
// 백엔드(Workers)도 같은 값을 wrangler.toml [vars] GOOGLE_CLIENT_ID 에 넣어야 검증된다.
export const GOOGLE_CLIENT_ID = ''
