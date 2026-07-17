-- 순공 자동 별점 지급 추적 (중복 지급 방지).
-- study_day_awards: 하루 시간 별점 누적 지급분 + 일일 목표 보너스 지급 여부.
-- study_goal_awards: 기간 누적목표 마일스톤(25/50/75/100%) 비트마스크.
CREATE TABLE IF NOT EXISTS study_day_awards (
  child_id TEXT NOT NULL,
  the_date TEXT NOT NULL,
  time_pts INTEGER NOT NULL DEFAULT 0,
  daily_goal INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (child_id, the_date)
);
CREATE TABLE IF NOT EXISTS study_goal_awards (
  child_id TEXT NOT NULL,
  goal_id TEXT NOT NULL,
  milestones INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (child_id, goal_id)
);
