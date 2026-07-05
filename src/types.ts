// aimgrim 도메인 타입 — D1 스키마 / API 응답과 1:1로 맞춘다.

export type Role = 'parent' | 'child'
export type Author = 'me' | 'mom' | 'dad'
export type Category = 'study' | 'life' | 'health' | 'play'
export type Period = 'day' | 'week' | 'month'
export type RewardTone = 'grape' | 'apricot' | 'mint'

/** 일정 항목 — 할일(day)과 목표(week/month)를 모두 표현하는 통합 타입 */
export interface ScheduleItem {
  id: string
  title: string
  category: Category
  /** 누가 만든 미션인지 (자율성 존중을 위해 표시) */
  author: Author
  /** 표시용 시간 라벨 (예: '오후 4:00', '자기 전') — day 항목용 */
  timeLabel: string
  points: number
  /** 자녀 완료 신고 여부 */
  done: boolean
  /** 부모 확인(승인) 여부 */
  approved: boolean
  /** 기간 목표 진행률 0–100 (week/month) */
  progress: number
  /** 진행 상황 라벨 (예: '2 / 4 권') */
  progressLabel: string
}

/** 자녀가 스스로 정한 보상 목표 (별점으로 교환) */
export interface RewardGoal {
  id: string
  title: string
  emoji: string
  cost: number
  saved: number
  tone: RewardTone
}

/** 부모의 격려 메시지 */
export interface Encouragement {
  id: string
  from: 'mom' | 'dad'
  message: string
}

/** 자녀 한 명의 화면 스냅샷 (API /snapshot 응답) */
export interface Snapshot {
  child: { name: string; points: number }
  todayTasks: ScheduleItem[]
  weekGoals: ScheduleItem[]
  monthGoal: ScheduleItem | null
  rewardGoals: RewardGoal[]
  encouragements: Encouragement[]
}

/** 주간 진행 (요일별 완료율) — 아직 이력 데이터가 없어 시각화용 placeholder */
export interface WeekDay {
  dayName: string
  dayNum: number
  completion: number // 0–100
  isToday: boolean
}
