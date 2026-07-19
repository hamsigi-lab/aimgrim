-- 비밀번호 재설정 토큰 (이메일 링크). 추가형(무손실).
CREATE TABLE IF NOT EXISTS password_resets (
  token TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pwreset_member ON password_resets(member_id);
