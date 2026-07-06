// aimgrim API 공용 코어 — 모든 도메인 라우터가 공유하는 타입/헬퍼.
// 새 가족 서비스(캘린더/용돈 등)를 추가할 때도 이 코어(가족/멤버 spine, 세션, 권한)를 재사용한다.
import { readSession, type SessionRow } from './session'

export type Bindings = { DB: D1Database; GOOGLE_CLIENT_ID?: string }
export type Author = 'me' | 'mom' | 'dad'

export const CONSENT_AGE = 14 // 만 14세 미만은 법정대리인 동의 필요 (개인정보보호법 §22조의2)
export const CATEGORIES = new Set(['study', 'life', 'health', 'play'])
export const PERIODS = new Set(['day', 'week', 'month'])

export interface MemberRow {
  id: string; family_id: string; role: string; parent_kind: string | null
  display_name: string; email: string | null; password_hash: string | null
  pin: string | null; birth_year: number | null; points: number; consent_at: number | null
}

export interface TaskRow {
  id: string; title: string; category: string; author_id: string; child_id: string
  parent_kind: string | null; points: number; time_label: string | null
  progress: number; progress_label: string | null; done: number | null; approved: number | null
  recur?: string | null; goal_id?: string | null; recur_days?: number | null
}

/** recur/시작일 기준으로 [aStart, aEnd] 범위에서 이 할일이 나타나는 날 수 */
export function occurrencesInRange(recur: string, startISO: string, aStart: string, aEnd: string, recurDaysMask = 0): number {
  const from = startISO > aStart ? startISO : aStart
  if (from > aEnd) return 0
  if (recur === 'once') return startISO >= aStart && startISO <= aEnd ? 1 : 0
  let count = 0
  const d = new Date(from + 'T00:00:00Z')
  const end = new Date(aEnd + 'T00:00:00Z')
  while (d <= end) {
    const dow = d.getUTCDay()
    if (recur === 'daily'
      || (recur === 'weekdays' && dow >= 1 && dow <= 5)
      || (recur === 'days' && (recurDaysMask & (1 << dow)) !== 0)) count++
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return count
}

export function authorLabel(authorId: string, childId: string, parentKind: string | null): Author {
  if (authorId === childId) return 'me'
  return parentKind === 'dad' ? 'dad' : 'mom'
}

export function ageFromBirthYear(birthYear: number): number {
  return new Date().getFullYear() - birthYear
}

// 한국 시간(KST, UTC+9) 기준 오늘 날짜 — 자정~오전9시 전날로 밀리는 것 방지
export function todayStr(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)
}

// 데모 가족은 고정 날짜(시드와 일치), 실제 가족은 KST 오늘
export const DEMO_DATE = '2026-07-05'
export function familyDate(familyId: string): string {
  return familyId === 'fam_demo' ? DEMO_DATE : todayStr()
}

// 기간별 별점 상한 (자녀 임의 고득점 방지)
export function maxPoints(period: string): number {
  return period === 'day' ? 50 : period === 'week' ? 200 : 500
}

// 하루 할일이 특정 날짜에 보여야 하는지 — the_date를 '시작일'로 취급(그 전날엔 안 뜸)
// recur: once(그날) / daily(매일) / weekdays(평일) / days(특정 요일 = recur_days 비트마스크)
// 사용: `AND ${DAY_RECUR_SQL}` + 바인딩에 dayRecurBinds(date, isWeekday, dayBit) 삽입
export const DAY_RECUR_SQL =
  "((t.recur = 'once' AND t.the_date = ?)" +
  " OR (t.recur = 'daily' AND t.the_date <= ?)" +
  " OR (t.recur = 'weekdays' AND t.the_date <= ? AND ? = 1)" +
  " OR (t.recur = 'days' AND t.the_date <= ? AND (COALESCE(t.recur_days,0) & ?) != 0))"
export function dayRecurBinds(date: string, isWeekday: number, dayBit: number): [string, string, string, number, string, number] {
  return [date, date, date, isWeekday, date, dayBit]
}
export function isWeekdayOf(date: string): number {
  const dow = new Date(date + 'T00:00:00Z').getUTCDay()
  return dow >= 1 && dow <= 5 ? 1 : 0
}
export function dayBitOf(date: string): number {
  return 1 << new Date(date + 'T00:00:00Z').getUTCDay()
}
export function daysToMask(days: number[]): number {
  return days.reduce((m, d) => (d >= 0 && d <= 6 ? m | (1 << d) : m), 0)
}
export function maskToDays(mask: number | null | undefined): number[] {
  if (!mask) return []
  const out: number[] = []
  for (let d = 0; d <= 6; d++) if (mask & (1 << d)) out.push(d)
  return out
}

export async function requireSession(db: D1Database, cookie: string | null): Promise<SessionRow | null> {
  return readSession(db, cookie)
}

/** 부모 세션만 통과 (없거나 자녀면 null) */
export async function readSessionParent(db: D1Database, cookie: string | null): Promise<SessionRow | null> {
  const session = await readSession(db, cookie)
  return session && session.role === 'parent' ? session : null
}

/** 세션이 해당 가족 소속인지 (가족 공용 서비스용 — 캘린더 등) */
export async function authFamily(db: D1Database, cookie: string | null, familyId: string): Promise<SessionRow | null> {
  const session = await readSession(db, cookie)
  return session && session.family_id === familyId ? session : null
}

/** 세션이 해당 자녀(가족 내)를 다룰 권한이 있는지. parent=가족 내 모든 자녀, child=본인만. */
export async function authChild(
  db: D1Database, cookie: string | null, childId: string,
): Promise<{ session: SessionRow; parentKind: string | null } | null> {
  const session = await readSession(db, cookie)
  if (!session) return null
  if (session.role === 'child' && session.member_id !== childId) return null
  const child = await db
    .prepare('SELECT id FROM members WHERE id = ? AND family_id = ? AND role = \'child\'')
    .bind(childId, session.family_id).first()
  if (!child) return null
  const me = await db.prepare('SELECT parent_kind FROM members WHERE id = ?').bind(session.member_id).first<{ parent_kind: string | null }>()
  return { session, parentKind: me?.parent_kind ?? null }
}

/** 현재 세션의 사용자/가족/자녀 목록 (프론트 부트스트랩용) */
export async function loadMe(db: D1Database, session: SessionRow) {
  const member = await db
    .prepare('SELECT id, family_id, role, parent_kind, display_name, birth_year, points FROM members WHERE id = ?')
    .bind(session.member_id).first<MemberRow>()
  if (!member) return null
  const family = await db
    .prepare('SELECT id, name, invite_code FROM families WHERE id = ?')
    .bind(session.family_id).first<{ id: string; name: string; invite_code: string }>()
  const children = await db
    .prepare('SELECT id, display_name, birth_year, consent_at FROM members WHERE family_id = ? AND role = \'child\' ORDER BY created_at')
    .bind(session.family_id).all<{ id: string; display_name: string; birth_year: number | null; consent_at: number | null }>()

  return {
    authenticated: true as const,
    member: { id: member.id, name: member.display_name, role: member.role, parentKind: member.parent_kind },
    family: family ? { id: family.id, name: family.name, inviteCode: family.invite_code } : null,
    children: children.results.map((c) => ({
      id: c.id, name: c.display_name, birthYear: c.birth_year,
      needsConsent: c.birth_year != null && ageFromBirthYear(c.birth_year) < CONSENT_AGE,
      hasConsent: c.consent_at != null,
    })),
  }
}
