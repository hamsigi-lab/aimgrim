-- 완료 기록: 오늘 무엇을 했는지 한 줄 메모 + 소요 시간(분). 공부 내용 기록.
ALTER TABLE completions ADD COLUMN note TEXT;
ALTER TABLE completions ADD COLUMN minutes INTEGER;
