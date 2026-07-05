-- 하루 할일 반복 설정: daily(매일·기본) | weekdays(평일만) | once(오늘 하루만)
ALTER TABLE tasks ADD COLUMN recur TEXT NOT NULL DEFAULT 'daily';
