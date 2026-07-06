-- 반복 규칙이 the_date를 '시작일'로 취급하도록 바뀌어서, 데모 하루 할일이
-- 시드된 완료 이력(2026-07-01~05)과 이번주 보기에서 함께 보이도록 시작일을 앞당긴다.
UPDATE tasks SET the_date = '2026-06-29' WHERE family_id = 'fam_demo' AND period = 'day';
