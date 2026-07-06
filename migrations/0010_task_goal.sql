-- 하루 할일을 주/월 목표에 연결 (cascade). 목표 진행률을 연결된 할일 완료율로 자동 계산.
ALTER TABLE tasks ADD COLUMN goal_id TEXT;
CREATE INDEX IF NOT EXISTS idx_tasks_goal ON tasks(goal_id);

-- 데모: 하루 할일을 이번주 목표에 연결해 자동 진행률을 보여준다.
UPDATE tasks SET goal_id = 'g1' WHERE id = 't2';   -- 수학 문제집 4쪽 → '수학 3단원 끝내기'
UPDATE tasks SET goal_id = 'g2' WHERE id = 't3';   -- 줄넘기 100개 → '주 3회 운동하기'
