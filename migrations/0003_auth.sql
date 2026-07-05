-- 인증/세션 + 법정대리인 동의

-- 부모 이메일은 로그인 아이디 → 전역 유니크
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_email ON members(email) WHERE email IS NOT NULL;

-- 만14세 미만 자녀에 대한 법정대리인(부모) 동의 시각 (개인정보보호법 §22조의2)
ALTER TABLE members ADD COLUMN consent_at INTEGER;
-- 동의를 준 부모 멤버 id
ALTER TABLE members ADD COLUMN consent_by TEXT;

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  member_id   TEXT NOT NULL REFERENCES members(id),
  family_id   TEXT NOT NULL REFERENCES families(id),
  role        TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_member ON sessions(member_id);
