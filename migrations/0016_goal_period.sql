-- 목표=계획 수립: 목표에 실천 기간(시작~종료). 하루 할일엔 종료일(언제까지 반복).
-- 목표는 start_date~end_date로 진행률·D-day 계산, 하위 실천은 end_date까지만 계획에 나타남.
ALTER TABLE tasks ADD COLUMN start_date TEXT;
ALTER TABLE tasks ADD COLUMN end_date TEXT;

-- 데모: 기존 주/월 목표에 방학 기간 부여 (시연)
UPDATE tasks SET start_date = '2026-06-29', end_date = '2026-07-12' WHERE id IN ('g1','g2','g3'); -- 주간 목표 → 2주
UPDATE tasks SET start_date = '2026-07-01', end_date = '2026-08-25' WHERE id = 'mg1';                -- 월간 목표 → 방학
