-- 별점 내역(ledger)에 사람이 읽을 설명 저장 — 과업 삭제 후에도 내역이 남도록 스냅샷.
ALTER TABLE point_ledger ADD COLUMN note TEXT;
