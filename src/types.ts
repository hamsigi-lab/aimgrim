// aimgrim 도메인 타입 — D1 스키마 / API 응답과 1:1로 맞춘다.

export type Role = 'parent' | 'child'
export type Author = 'me' | 'mom' | 'dad'
export type Category = 'study' | 'life' | 'health' | 'play'
export type Period = 'day' | 'week' | 'month'
export type Recur = 'daily' | 'weekdays' | 'once' | 'days'
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
  /** 하루 할일 반복 규칙 */
  recur: Recur
  /** recur='days'일 때 선택된 요일 (0=일 .. 6=토) */
  recurDays: number[]
  /** 연결된 주/월 목표 id (cascade) */
  goalId: string | null
  /** 목표 진행률이 연결된 할일로 자동 계산됨 */
  autoProgress?: boolean
  /** 완료 기록 — 오늘 무엇을 했는지 한 줄 메모 */
  note?: string
  /** 완료 기록 — 소요 시간(분, 선택) */
  minutes?: number
}

/** 목표(주/월) — 그 아래 하위 계획(daily 실천)을 중첩해 담는다 */
export interface GoalItem extends ScheduleItem {
  /** 목표 기간 */
  period: 'week' | 'month'
  /** 이 목표를 이루기 위한 하루 실천들 (goal_id로 연결된 day 할일) */
  subplans: ScheduleItem[]
}

/** 자녀가 스스로 정한 보상 목표 (별점으로 교환). 진행률은 현재 별점 기준으로 계산. */
export interface RewardGoal {
  id: string
  title: string
  emoji: string
  cost: number
  tone: RewardTone
  redeemed: boolean
}

/** 부모의 격려 메시지 */
export interface Encouragement {
  id: string
  from: 'mom' | 'dad'
  message: string
  createdAt: number
}

/** 하루 완료 이력 (한 날짜에 완료한 할일 수) */
export interface DayHistory {
  date: string // YYYY-MM-DD
  done: number
}

/** 자녀 한 명의 화면 스냅샷 (API /snapshot 응답) */
export interface Snapshot {
  /** 기준 '오늘' 날짜 (KST, 데모는 고정) */
  today: string
  /** 연속 달성 일수 */
  streak: number
  /** 현재 하루 할일 개수 (완료율 분모) */
  dayTaskCount: number
  /** 완료 이력 (주간 링·월간 히트맵용) */
  history: DayHistory[]
  child: { name: string; points: number }
  todayTasks: ScheduleItem[]
  /** 모든 목표(주+월) — 하위 계획 중첩 포함. 목표 탭·계획 그룹핑의 원천 */
  goals: GoalItem[]
  weekGoals: ScheduleItem[]
  monthGoal: ScheduleItem | null
  rewardGoals: RewardGoal[]
  encouragements: Encouragement[]
}
