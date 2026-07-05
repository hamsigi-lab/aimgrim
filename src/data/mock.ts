// MVP용 목업 데이터. 이후 D1 API 응답으로 교체된다.
import type {
  Task, Goal, RewardGoal, Encouragement, WeekDay,
} from '../types'

export const childName = '지우'

export const todayTasks: Task[] = [
  { id: 't1', title: '아침 스트레칭 하기', category: 'life', author: 'me', timeLabel: '오전 7:30', points: 10, done: true, approved: true },
  { id: 't2', title: '수학 문제집 4쪽 풀기', category: 'study', author: 'mom', timeLabel: '오후 4:00', points: 20, done: false, approved: false },
  { id: 't3', title: '줄넘기 100개', category: 'health', author: 'me', timeLabel: '오후 6:00', points: 10, done: false, approved: false },
  { id: 't4', title: '영어 단어 10개 외우기', category: 'study', author: 'dad', timeLabel: '오후 8:00', points: 15, done: false, approved: false },
  { id: 't5', title: '책상 정리하기', category: 'life', author: 'me', timeLabel: '자기 전', points: 5, done: false, approved: false },
]

export const weekGoals: Goal[] = [
  { id: 'g1', title: '수학 문제집 3단원 끝내기', category: 'study', author: 'me', period: 'week', progress: 60, points: 50, progressLabel: '60% 진행' },
  { id: 'g2', title: '주 3회 운동하기', category: 'play', author: 'mom', period: 'week', progress: 66, points: 30, progressLabel: '2 / 3 회' },
]

/** 오늘 화면 상단에 크게 보여줄 대표 목표 */
export const heroGoal: Goal = weekGoals[0]

export const monthGoal: Goal = {
  id: 'mg1', title: '책 4권 읽기', category: 'study', author: 'me', period: 'month',
  progress: 50, points: 80, progressLabel: '2 / 4 권 · 절반 왔어요!',
}

export const weekDays: WeekDay[] = [
  { dayName: '월', dayNum: 1, completion: 100, isToday: false },
  { dayName: '화', dayNum: 2, completion: 100, isToday: false },
  { dayName: '수', dayNum: 3, completion: 60, isToday: false },
  { dayName: '목', dayNum: 4, completion: 100, isToday: false },
  { dayName: '금', dayNum: 5, completion: 40, isToday: false },
  { dayName: '토', dayNum: 6, completion: 0, isToday: true },
  { dayName: '일', dayNum: 7, completion: 0, isToday: false },
]

export const rewardGoals: RewardGoal[] = [
  { id: 'r1', title: '미술 세트', emoji: '🎨', cost: 300, saved: 240, tone: 'grape' },
  { id: 'r2', title: '주말 게임 1시간', emoji: '🎮', cost: 100, saved: 100, tone: 'apricot' },
  { id: 'r3', title: '새 자전거', emoji: '🚲', cost: 1000, saved: 240, tone: 'mint' },
]

export const encouragements: Encouragement[] = [
  { id: 'e1', from: 'mom', message: '이번주 계획 스스로 세운 거 정말 멋져! 조금씩 해내는 네가 자랑스러워 🥰' },
  { id: 'e2', from: 'dad', message: '스스로 정한 목표까지 60점 남았네! 오늘 할일 하나면 훌쩍 가까워진다 😆' },
]

export const startingPoints = 240
