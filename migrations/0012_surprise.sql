-- 깜짝 상자(서프라이즈 보너스) — 하루 계획을 다 해낸 날 가끔 주어지는 상징 보상.
-- 하루 1회 제한(UNIQUE), 돈·구매 없음. 초반 자주→점차 줄임(taper).
CREATE TABLE IF NOT EXISTS surprises (
  id          TEXT PRIMARY KEY,
  child_id    TEXT NOT NULL REFERENCES members(id),
  the_date    TEXT NOT NULL,
  points      INTEGER NOT NULL,
  message     TEXT,
  created_at  INTEGER NOT NULL,
  UNIQUE (child_id, the_date)
);
