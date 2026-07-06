-- 부모 Google 계정 연동: google_sub(구글 사용자 고유 id) 저장. 비밀번호 없이 가입 가능.
ALTER TABLE members ADD COLUMN google_sub TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_google ON members(google_sub) WHERE google_sub IS NOT NULL;
