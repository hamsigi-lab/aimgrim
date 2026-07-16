-- 순공시간(순수 공부시간) — 과목(색) + 학습 세션. 시간엔 별점 미지급(시간 부풀리기 방지).
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subjects_child ON subjects(child_id);

CREATE TABLE IF NOT EXISTS study_sessions (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  subject_id TEXT,
  subject_name TEXT NOT NULL,
  color TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  note TEXT,
  the_date TEXT NOT NULL,
  task_id TEXT,
  mode TEXT NOT NULL DEFAULT 'stopwatch',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_child_date ON study_sessions(child_id, the_date);

-- 데모: 과목 + 최근 학습 세션 시드(주/월 통계·히트맵 시연)
INSERT OR IGNORE INTO subjects (id, family_id, child_id, name, color, sort_order, created_at) VALUES
  ('sub_math', 'fam_demo', 'mem_child', '수학', '#9A86E8', 1, 1783200000000),
  ('sub_eng',  'fam_demo', 'mem_child', '영어', '#2FB79A', 2, 1783200000000),
  ('sub_kor',  'fam_demo', 'mem_child', '국어', '#FF9A6B', 3, 1783200000000),
  ('sub_sci',  'fam_demo', 'mem_child', '과학', '#FF7EA6', 4, 1783200000000);

INSERT OR IGNORE INTO study_sessions (id, family_id, child_id, subject_id, subject_name, color, minutes, note, the_date, mode, created_at) VALUES
  ('ss1', 'fam_demo', 'mem_child', 'sub_math', '수학', '#9A86E8', 50, '문제집 32~35쪽', '2026-07-01', 'stopwatch', 1783200000000),
  ('ss2', 'fam_demo', 'mem_child', 'sub_eng',  '영어', '#2FB79A', 30, '단어 20개',      '2026-07-01', 'stopwatch', 1783200000000),
  ('ss3', 'fam_demo', 'mem_child', 'sub_math', '수학', '#9A86E8', 40, NULL,             '2026-07-02', 'stopwatch', 1783200000000),
  ('ss4', 'fam_demo', 'mem_child', 'sub_kor',  '국어', '#FF9A6B', 25, '독서',           '2026-07-02', 'stopwatch', 1783200000000),
  ('ss5', 'fam_demo', 'mem_child', 'sub_sci',  '과학', '#FF7EA6', 35, NULL,             '2026-07-03', 'stopwatch', 1783200000000),
  ('ss6', 'fam_demo', 'mem_child', 'sub_math', '수학', '#9A86E8', 60, '오답노트',       '2026-07-04', 'stopwatch', 1783200000000),
  ('ss7', 'fam_demo', 'mem_child', 'sub_eng',  '영어', '#2FB79A', 45, NULL,             '2026-07-05', 'stopwatch', 1783200000000),
  ('ss8', 'fam_demo', 'mem_child', 'sub_kor',  '국어', '#FF9A6B', 20, NULL,             '2026-07-05', 'stopwatch', 1783200000000);
