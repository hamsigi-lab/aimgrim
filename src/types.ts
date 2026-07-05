// aimgrim 도메인 타입 — 이후 D1 스키마와 1:1로 맞춘다.

export type Role = 'parent' | 'child'
export type Author = 'me' | 'mom' | 'dad'
export type Category = 'study' | 'life' | 'health' | 'play'
export type Period = 'day' | 'week' | 'month'

/** 할일 / 미션 — 자녀 또는 부모가 만든 하나의 일정 항목 */
export interface Task {
  id: string
  title: string
  category: Category
  /** 누가 만든 미션인지 (자율성 존중을 위해 표시) */
  author: Author
  /** 표시용 시간 라벨 (예: '오후 4:00', '자기 전') */
  timeLabel: string
  points: number
  done: boolean
  /** 부모 확인 여부 — 완료 신고 후 부모 승인 */
  approved: boolean
}

/** 기간 목표 (주간/월간) */
export interface Goal {
  id: string
  title: string
  category: Category
  author: Author
  period: Period
  /** 0–100 진행률 */
  progress: number
  points: number
  /** 진행 상황 표시용 라벨 (예: '2 / 4 권', '60% 진행') */
  progressLabel: string
}

/** 자녀가 스스로 정한 보상 목표 (포인트로 교환) */
export interface RewardGoal {
  id: string
  title: string
  emoji: string
  cost: number
  saved: number
  tone: 'grape' | 'apricot' | 'mint'
}

/** 부모의 격려 메시지 */
export interface Encouragement {
  id: string
  from: 'mom' | 'dad'
  message: string
}

/** 주간 진행 (요일별 완료율) */
export interface WeekDay {
  dayName: string
  dayNum: number
  completion: number // 0–100
  isToday: boolean
}
