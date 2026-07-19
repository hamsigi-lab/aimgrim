// 이메일 발송 — Resend API. RESEND_API_KEY가 없으면 비활성(false 반환).
// 활성화: Cloudflare Pages 프로젝트 환경변수에 RESEND_API_KEY, EMAIL_FROM(예: aimgrim <no-reply@도메인>) 설정.
import type { Bindings } from './core'

export function emailEnabled(env: Bindings): boolean {
  return !!(env.RESEND_API_KEY && env.EMAIL_FROM)
}

export async function sendEmail(env: Bindings, to: string, subject: string, html: string): Promise<boolean> {
  if (!emailEnabled(env)) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, html }),
    })
    return res.ok
  } catch {
    return false
  }
}
