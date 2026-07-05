-- 데모 가족 '지우네' 시드 — 배포 사이트에서 실제 저장된 데이터로 화면을 보여준다.
-- (이후 온보딩이 붙으면 실제 가족이 생성되고, 이 데모는 참고용/체험용으로 남는다.)

DELETE FROM point_ledger WHERE child_id = 'mem_child';
DELETE FROM encouragements WHERE child_id = 'mem_child';
DELETE FROM reward_goals WHERE child_id = 'mem_child';
DELETE FROM completions WHERE task_id IN (SELECT id FROM tasks WHERE family_id = 'fam_demo');
DELETE FROM tasks WHERE family_id = 'fam_demo';
DELETE FROM members WHERE family_id = 'fam_demo';
DELETE FROM families WHERE id = 'fam_demo';

INSERT INTO families (id, name, invite_code, created_at)
VALUES ('fam_demo', '지우네', 'JIWOO25', 1783200000000);

INSERT INTO members (id, family_id, role, parent_kind, display_name, email, birth_year, points, created_at) VALUES
  ('mem_mom',   'fam_demo', 'parent', 'mom', '엄마', 'demo-mom@aimgrim.app', NULL, 0,   1783200000000),
  ('mem_dad',   'fam_demo', 'parent', 'dad', '아빠', 'demo-dad@aimgrim.app', NULL, 0,   1783200000000),
  ('mem_child', 'fam_demo', 'child',  NULL,  '지우', NULL,                    2013, 240, 1783200000000);

-- 오늘(2026-07-05) 할일
INSERT INTO tasks (id, family_id, child_id, title, category, period, author_id, points, the_date, time_label, sort_order, created_at) VALUES
  ('t1', 'fam_demo', 'mem_child', '아침 스트레칭 하기',   'life',   'day', 'mem_child', 10, '2026-07-05', '오전 7:30', 1, 1783200000000),
  ('t2', 'fam_demo', 'mem_child', '수학 문제집 4쪽 풀기', 'study',  'day', 'mem_mom',   20, '2026-07-05', '오후 4:00', 2, 1783200000000),
  ('t3', 'fam_demo', 'mem_child', '줄넘기 100개',         'health', 'day', 'mem_child', 10, '2026-07-05', '오후 6:00', 3, 1783200000000),
  ('t4', 'fam_demo', 'mem_child', '영어 단어 10개 외우기','study',  'day', 'mem_dad',   15, '2026-07-05', '오후 8:00', 4, 1783200000000),
  ('t5', 'fam_demo', 'mem_child', '책상 정리하기',        'life',   'day', 'mem_child',  5, '2026-07-05', '자기 전',   5, 1783200000000);

-- 주간 목표
INSERT INTO tasks (id, family_id, child_id, title, category, period, author_id, points, progress, progress_label, sort_order, created_at) VALUES
  ('g1', 'fam_demo', 'mem_child', '수학 문제집 3단원 끝내기', 'study', 'week', 'mem_child', 50, 60, '60% 진행', 1, 1783200000000),
  ('g2', 'fam_demo', 'mem_child', '주 3회 운동하기',          'play',  'week', 'mem_mom',   30, 66, '2 / 3 회', 2, 1783200000000);

-- 이달의 목표
INSERT INTO tasks (id, family_id, child_id, title, category, period, author_id, points, progress, progress_label, sort_order, created_at) VALUES
  ('mg1', 'fam_demo', 'mem_child', '책 4권 읽기', 'study', 'month', 'mem_child', 80, 50, '2 / 4 권 · 절반 왔어요!', 1, 1783200000000);

-- 완료 상태 (아침 스트레칭은 완료+부모승인)
INSERT INTO completions (task_id, done, approved, completed_at, approved_at) VALUES
  ('t1', 1, 1, 1783202000000, 1783203000000);

-- 자녀가 정한 보상 목표
INSERT INTO reward_goals (id, child_id, title, emoji, tone, cost, saved, sort_order, created_at) VALUES
  ('r1', 'mem_child', '미술 세트',       '🎨', 'grape',   300, 240,  1, 1783200000000),
  ('r2', 'mem_child', '주말 게임 1시간', '🎮', 'apricot', 100, 100,  2, 1783200000000),
  ('r3', 'mem_child', '새 자전거',       '🚲', 'mint',   1000, 240,  3, 1783200000000);

-- 부모 격려
INSERT INTO encouragements (id, child_id, from_id, from_kind, message, created_at) VALUES
  ('e1', 'mem_child', 'mem_mom', 'mom', '이번주 계획 스스로 세운 거 정말 멋져! 조금씩 해내는 네가 자랑스러워 🥰', 1783202500000),
  ('e2', 'mem_child', 'mem_dad', 'dad', '스스로 정한 목표까지 60점 남았네! 오늘 할일 하나면 훌쩍 가까워진다 😆', 1783203500000);
