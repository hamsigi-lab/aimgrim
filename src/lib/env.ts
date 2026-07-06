// 실행 환경 감지 — 인앱 브라우저(카톡 등)에선 Google 로그인이 막히므로 안내에 사용.

/** 카카오톡·인스타·페북·네이버·라인 등 앱 속 브라우저(WebView) 여부 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /KAKAOTALK|Instagram|FBAN|FBAV|FB_IAB|NAVER\(inapp|Line\/|DaumApps|; wv\)|Snapchat|Twitter|KAKAOSTORY/i.test(ua)
}

/** iOS 홈 화면 추가(standalone) 실행 — 여기서도 Google 팝업 로그인이 막힐 수 있음 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as unknown as { standalone?: boolean }
  return window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true
}

/** Google 로그인이 막힐 가능성이 높은 환경인지 */
export function googleMayBeBlocked(): boolean {
  return isInAppBrowser() || isStandalone()
}
