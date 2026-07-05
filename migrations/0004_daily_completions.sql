-- 일일 완료 모델: 하루 할일은 매일 반복되는 루틴이고, 완료는 (task, 날짜)마다 기록된다.
-- 기존 completions(task_id 단일 키)는 '오늘'이 매일 리셋되지 않는 버그가 있어 재설계.

DROP TABLE IF EXISTS completions;
CREATE TABLE completions (
  task_id       TEXT NOT NULL REFERENCES tasks(id),
  the_date      TEXT NOT NULL,                -- YYYY-MM-DD
  done          INTEGER NOT NULL DEFAULT 0,
  approved      INTEGER NOT NULL DEFAULT 0,
  completed_at  INTEGER,
  approved_at   INTEGER,
  PRIMARY KEY (task_id, the_date)
);
CREATE INDEX IF NOT EXISTS idx_completions_date ON completions(the_date);

-- 보상 교환(redeem) 시각 — B6에서 사용
ALTER TABLE reward_goals ADD COLUMN redeemed_at INTEGER;

-- 데모 가족: 최근 며칠 완료 이력을 넣어 주간 링·월간 히트맵·연속달성이 살아있게 한다.
-- 데모의 '오늘'은 고정 2026-07-05.
INSERT INTO completions (task_id, the_date, done, approved, completed_at) VALUES
  ('t1','2026-07-01',1,1,1783200000000),('t2','2026-07-01',1,1,1783200000000),('t3','2026-07-01',1,1,1783200000000),('t4','2026-07-01',1,1,1783200000000),('t5','2026-07-01',1,1,1783200000000),
  ('t1','2026-07-02',1,1,1783286400000),('t2','2026-07-02',1,1,1783286400000),('t3','2026-07-02',1,1,1783286400000),('t4','2026-07-02',1,1,1783286400000),('t5','2026-07-02',1,1,1783286400000),
  ('t1','2026-07-03',1,1,1783372800000),('t2','2026-07-03',1,1,1783372800000),('t3','2026-07-03',1,1,1783372800000),
  ('t1','2026-07-04',1,1,1783459200000),('t2','2026-07-04',1,1,1783459200000),('t3','2026-07-04',1,1,1783459200000),('t4','2026-07-04',1,1,1783459200000),('t5','2026-07-04',1,1,1783459200000),
  ('t1','2026-07-05',1,1,1783545600000);
