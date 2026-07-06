-- 가족 공유 캘린더 (2차 서비스) — 가족 구성원이 함께 보는 일정/이벤트.
-- 공용 spine(families/members)을 재사용, family_id로 격리.
CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  family_id   TEXT NOT NULL REFERENCES families(id),
  title       TEXT NOT NULL,
  the_date    TEXT NOT NULL,              -- YYYY-MM-DD
  time_label  TEXT,                       -- 표시용 (예: '오후 3시')
  category    TEXT NOT NULL DEFAULT 'family' CHECK (category IN ('family','school','birthday','trip','etc')),
  for_member  TEXT,                        -- 특정 구성원 일정 (NULL=온가족)
  note        TEXT,
  author_id   TEXT NOT NULL REFERENCES members(id),
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_family_date ON events(family_id, the_date);

-- 데모 가족 이벤트 몇 개 (2026년 7월)
INSERT INTO events (id, family_id, title, the_date, time_label, category, for_member, note, author_id, created_at) VALUES
  ('ev1','fam_demo','가족 나들이','2026-07-11','오전 10시','trip',NULL,'한강 소풍','mem_mom',1783200000000),
  ('ev2','fam_demo','지우 피아노 발표회','2026-07-18','오후 4시','school','mem_child',NULL,'mem_mom',1783200000000),
  ('ev3','fam_demo','아빠 생일','2026-07-25',NULL,'birthday','mem_dad','케이크 준비!','mem_child',1783200000000);
