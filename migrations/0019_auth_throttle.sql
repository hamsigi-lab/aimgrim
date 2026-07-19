-- 무차별 대입(brute-force) 차단: 로그인·자녀PIN·초대코드 실패 횟수를 창(window) 단위로 집계.
-- 추가형(무손실). 성공/창 만료 시 정리.
CREATE TABLE IF NOT EXISTS auth_throttle (
  bucket TEXT PRIMARY KEY,
  fails INTEGER NOT NULL DEFAULT 0,
  first_at INTEGER NOT NULL
);
