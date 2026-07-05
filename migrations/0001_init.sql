-- aimgrim 초기 스키마 (D1 / SQLite)
-- 가족 → 멤버(부모/자녀) → 일정(할일/목표) → 완료 → 포인트/보상/격려

CREATE TABLE IF NOT EXISTS families (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  invite_code  TEXT NOT NULL UNIQUE,     -- 자녀가 가족에 입장할 때 쓰는 초대코드
  created_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  id            TEXT PRIMARY KEY,
  family_id     TEXT NOT NULL REFERENCES families(id),
  role          TEXT NOT NULL CHECK (role IN ('parent','child')),
  parent_kind   TEXT CHECK (parent_kind IN ('mom','dad')),  -- 부모 표시용(엄마/아빠), 자녀는 NULL
  display_name  TEXT NOT NULL,
  email         TEXT,           -- 부모 전용 (로그인 아이디)
  password_hash TEXT,           -- 부모 전용 (PBKDF2)
  pin           TEXT,           -- 자녀 선택 (간단 잠금)
  birth_year    INTEGER,        -- 만14세 미만 동의 판단용
  points        INTEGER NOT NULL DEFAULT 0,  -- 자녀 누적 별점
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_members_family ON members(family_id);

CREATE TABLE IF NOT EXISTS tasks (
  id           TEXT PRIMARY KEY,
  family_id    TEXT NOT NULL REFERENCES families(id),
  child_id     TEXT NOT NULL REFERENCES members(id),   -- 누구의 일정인지
  title        TEXT NOT NULL,
  category     TEXT NOT NULL CHECK (category IN ('study','life','health','play')),
  period       TEXT NOT NULL CHECK (period IN ('day','week','month')),
  author_id    TEXT NOT NULL REFERENCES members(id),   -- 누가 만들었는지
  points       INTEGER NOT NULL DEFAULT 10,
  the_date     TEXT,            -- day 항목용 (YYYY-MM-DD)
  time_label   TEXT,            -- 표시용 (예: '오후 4:00', '자기 전')
  progress     INTEGER NOT NULL DEFAULT 0,   -- week/month 목표 진행률 0–100
  progress_label TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_child ON tasks(child_id, period, the_date);

CREATE TABLE IF NOT EXISTS completions (
  task_id       TEXT PRIMARY KEY REFERENCES tasks(id),
  done          INTEGER NOT NULL DEFAULT 0,   -- 자녀 완료 신고 0/1
  approved      INTEGER NOT NULL DEFAULT 0,   -- 부모 승인 0/1
  completed_at  INTEGER,
  approved_at   INTEGER
);

CREATE TABLE IF NOT EXISTS reward_goals (
  id          TEXT PRIMARY KEY,
  child_id    TEXT NOT NULL REFERENCES members(id),
  title       TEXT NOT NULL,
  emoji       TEXT,
  tone        TEXT NOT NULL DEFAULT 'mint' CHECK (tone IN ('grape','apricot','mint')),
  cost        INTEGER NOT NULL,
  saved       INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rewards_child ON reward_goals(child_id);

CREATE TABLE IF NOT EXISTS encouragements (
  id          TEXT PRIMARY KEY,
  child_id    TEXT NOT NULL REFERENCES members(id),
  from_id     TEXT NOT NULL REFERENCES members(id),
  from_kind   TEXT NOT NULL,   -- 'mom' / 'dad' (표시용)
  message     TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cheer_child ON encouragements(child_id);

-- 포인트 변경 이력 (감사/디버깅용)
CREATE TABLE IF NOT EXISTS point_ledger (
  id          TEXT PRIMARY KEY,
  child_id    TEXT NOT NULL REFERENCES members(id),
  delta       INTEGER NOT NULL,
  reason      TEXT NOT NULL,
  task_id     TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ledger_child ON point_ledger(child_id);
