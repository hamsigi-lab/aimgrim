-- 순공 기간 누적목표 (예: 여름방학 동안 200시간) + 일일 목표시간.
-- 진행 = 기간 내 study_sessions 자동 합산(단일 출처 → 중복집계 없음).
CREATE TABLE IF NOT EXISTS study_goals (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  title TEXT NOT NULL,
  target_min INTEGER NOT NULL,        -- 기간 누적 목표(분). 200시간 = 12000
  daily_target_min INTEGER,           -- 일일 목표(분, 선택)
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_studygoals_child ON study_goals(child_id);

-- 데모: 여름방학 200시간 순공 (7/1~8/25), 하루 3시간 목표
INSERT OR IGNORE INTO study_goals (id, family_id, child_id, title, target_min, daily_target_min, start_date, end_date, created_at) VALUES
  ('sg_demo', 'fam_demo', 'mem_child', '여름방학 순공', 12000, 180, '2026-07-01', '2026-08-25', 1783200000000);
