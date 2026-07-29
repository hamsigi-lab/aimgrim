-- 잔소리 카드 — 자녀별 누적 잔소리 카운트(5회마다 별점 감점 후 -5). 추가형(무손실).
ALTER TABLE members ADD COLUMN nag_count INTEGER DEFAULT 0;
