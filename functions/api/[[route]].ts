// aimgrim API — Cloudflare Pages Functions 진입점. /api/* 로 서빙. env.DB = D1.
//
// 도메인별 라우터를 합성한다. 새 가족 서비스(캘린더/용돈/사진 등)를 추가할 때는
//   1) functions/_domains/<서비스>.ts 에 Hono 라우터를 만들고
//   2) 여기에 app.route('/', <서비스>Routes) 한 줄만 추가한다.
// 공용 spine(가족/멤버/세션/권한)은 functions/_lib/core.ts 를 재사용.
import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import type { Bindings } from '../_lib/core'
import { authRoutes } from '../_domains/auth'
import { scheduleRoutes } from '../_domains/schedule'
import { rewardRoutes } from '../_domains/rewards'
import { calendarRoutes } from '../_domains/calendar'
import { studyRoutes } from '../_domains/study'
import { accountRoutes } from '../_domains/account'

const app = new Hono<{ Bindings: Bindings }>().basePath('/api')

app.route('/', authRoutes)      // 인증·가족·멤버
app.route('/', scheduleRoutes)  // 일정(할일/목표)·완료·승인
app.route('/', rewardRoutes)    // 보상·별점 내역·격려
app.route('/', calendarRoutes)  // 가족 공유 캘린더
app.route('/', studyRoutes)     // 순공시간(과목·세션·통계)
app.route('/', accountRoutes)   // 데이터 내보내기·계정 삭제

export const onRequest = handle(app)
