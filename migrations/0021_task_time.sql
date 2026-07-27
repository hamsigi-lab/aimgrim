-- 시간블록형 계획: 할일에 옵션 시작/종료 시각(자정 기준 분). 추가형(무손실).
-- NULL이면 '언제든 할 일'(인박스). 기존 할일은 그대로 유지되고, 파싱되는 time_label은
-- 읽는 시점에 보조로 시각화(저장은 하지 않음 → 무손실).
ALTER TABLE tasks ADD COLUMN start_min INTEGER;
ALTER TABLE tasks ADD COLUMN end_min INTEGER;

-- 데모: 오늘 할일에 대략 시간블록 부여(시연). 실제 가족 데이터는 건드리지 않음.
UPDATE tasks SET start_min = 450          WHERE id = 't1'; -- 아침 스트레칭 7:30
UPDATE tasks SET start_min = 960, end_min = 1000 WHERE id = 't2'; -- 수학 16:00~16:40
UPDATE tasks SET start_min = 1080         WHERE id = 't3'; -- 줄넘기 18:00
UPDATE tasks SET start_min = 1200         WHERE id = 't4'; -- 영어 20:00
UPDATE tasks SET start_min = 1260         WHERE id = 't5'; -- 책상 정리 21:00
UPDATE tasks SET start_min = 1140, end_min = 1200 WHERE id = 't6'; -- 독서 19:00~20:00
