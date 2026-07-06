-- 반복 '특정 요일'(recur='days')용 요일 비트마스크. bit0=일 .. bit6=토
ALTER TABLE tasks ADD COLUMN recur_days INTEGER;
