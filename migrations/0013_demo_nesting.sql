-- 데모: '목표 → 하위 계획 중첩'을 화면에서 보여주기 위한 시드 보강.
-- 생활 영역 목표(g3)와 그 하위 실천(t1·t5), 학습 월간목표(mg1)의 하위 실천(t6)을 연결한다.

INSERT OR IGNORE INTO tasks (id, family_id, child_id, title, category, period, author_id, points, progress, progress_label, sort_order, created_at) VALUES
  ('g3', 'fam_demo', 'mem_child', '기본 생활 습관 지키기', 'life', 'week', 'mem_child', 40, 0, '', 3, 1783200000000);

INSERT OR IGNORE INTO tasks (id, family_id, child_id, title, category, period, author_id, points, the_date, time_label, recur, sort_order, created_at) VALUES
  ('t6', 'fam_demo', 'mem_child', '책 30분 읽기', 'study', 'day', 'mem_child', 15, '2026-06-29', '저녁', 'daily', 6, 1783200000000);

-- 하위 계획을 상위 목표에 연결 (실천할수록 목표 진행률 자동 롤업)
UPDATE tasks SET goal_id = 'g3'  WHERE id IN ('t1', 't5');
UPDATE tasks SET goal_id = 'mg1' WHERE id = 't6';
