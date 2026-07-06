import { useEffect, useRef } from 'react'
import { GOOGLE_CLIENT_ID } from '../config'

// google.accounts.id 전역 타입 (GIS 스크립트가 주입)
interface GsiId {
  initialize: (opts: { client_id: string; callback: (r: { credential: string }) => void }) => void
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void
}
declare global {
  interface Window { google?: { accounts?: { id?: GsiId } } }
}

/** 설정된 경우에만 'Google로 계속하기' 버튼을 렌더. onCredential에 ID 토큰 전달. */
export function GoogleButton({ onCredential }: { onCredential: (credential: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const cb = useRef(onCredential)
  cb.current = onCredential

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    let tries = 0
    const timer = window.setInterval(() => {
      const id = window.google?.accounts?.id
      if (!id || !ref.current) { if (++tries > 40) window.clearInterval(timer); return }
      window.clearInterval(timer)
      id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (r) => cb.current(r.credential) })
      id.renderButton(ref.current, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: 300, logo_alignment: 'center' })
    }, 100)
    return () => window.clearInterval(timer)
  }, [])

  if (!GOOGLE_CLIENT_ID) return null
  return <div className="gbtn-wrap"><div ref={ref} /></div>
}

export const googleEnabled = !!GOOGLE_CLIENT_ID
