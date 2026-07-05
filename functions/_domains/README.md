# API 도메인 라우터

각 파일은 하나의 가족 서비스(도메인)를 담당하는 [Hono](https://hono.dev) 라우터입니다.
`functions/api/[[route]].ts`(진입점)가 이들을 합성해 `/api/*`로 서빙합니다.

| 파일 | 도메인 | 대표 경로 |
|---|---|---|
| `auth.ts` | 인증·가족·멤버 | `/auth/*`, `/children`, `/join/:code`, `/me` |
| `schedule.ts` | 일정(할일/목표)·완료·승인 | `/family/:id/snapshot`, `/tasks*` |
| `rewards.ts` | 보상·별점 내역·격려 | `/reward-goals*`, `/point-ledger`, `/encouragements` |

## 새 가족 서비스 추가하는 법

예: 가족 공유 캘린더(`calendar`)를 붙인다면

1. **데이터**: `migrations/000N_calendar.sql` 에 `family_id`를 가진 새 테이블을 만든다.
   (가족/멤버는 공용 spine이므로 재사용 — 별도 사용자 테이블 만들지 말 것)
2. **라우터**: `functions/_domains/calendar.ts` 에 `export const calendarRoutes = new Hono<{ Bindings }>()` 를 만들고
   `functions/_lib/core.ts` 의 `authChild` / `readSessionParent` / `requireSession` 로 권한을 검증한다.
   (모든 테이블 접근은 세션의 `family_id` 일치를 확인하는 이 불변식을 반드시 지킬 것)
3. **합성**: 진입점에 `app.route('/', calendarRoutes)` 한 줄 추가.
4. **프론트**: `src/lib`·`src/components` 패턴을 따라 화면을 추가하고, 필요 시 하단 네비에 서비스 항목을 추가.

## 공용 코어 (`functions/_lib/`)

- `core.ts` — Bindings·타입·권한 헬퍼(`authChild`, `readSessionParent`, `requireSession`, `loadMe`), 날짜(`familyDate`, KST), 상한.
- `session.ts` — 세션 토큰/쿠키.
- `crypto.ts` — 비밀번호 해시(PBKDF2), 토큰·초대코드·id 생성.

**보안 불변식**: 새 서비스의 모든 데이터는 `family_id`를 갖고, 세션의 가족과 일치하는지 확인한다. `point_ledger`는 별점의 단일 원장이다(보상 교환도 여기에 기록).
