// 마스코트 '그리미' — 새싹-별 캐릭터. 별점을 모으면 통통 튀며 반응한다.
export function Mascot({ size = 132 }: { size?: number }) {
  return (
    <svg viewBox="0 0 132 132" width={size} height={size} role="img" aria-label="마스코트 그리미">
      <ellipse cx="66" cy="120" rx="34" ry="7" fill="#1E8E78" opacity=".12" />
      <path d="M66 34 C64 20 54 14 46 12 C52 20 54 28 60 33 Z" fill="#3FBF8E" />
      <path d="M66 34 C68 22 78 15 88 14 C80 22 78 30 72 34 Z" fill="#59CC9E" />
      <rect x="63" y="28" width="6" height="16" rx="3" fill="#2AA981" />
      <circle cx="66" cy="74" r="40" fill="#7BD9BC" />
      <circle cx="66" cy="74" r="40" fill="url(#grimiBody)" />
      <defs>
        <radialGradient id="grimiBody" cx="40%" cy="34%" r="70%">
          <stop offset="0" stopColor="#A8ECD6" />
          <stop offset="1" stopColor="#57C9A6" />
        </radialGradient>
      </defs>
      <circle cx="52" cy="72" r="5.5" fill="#20463C" />
      <circle cx="80" cy="72" r="5.5" fill="#20463C" />
      <circle cx="54" cy="70" r="1.8" fill="#fff" />
      <circle cx="82" cy="70" r="1.8" fill="#fff" />
      <circle cx="45" cy="83" r="5" fill="#FF9CB4" opacity=".65" />
      <circle cx="87" cy="83" r="5" fill="#FF9CB4" opacity=".65" />
      <path d="M58 84 Q66 92 74 84" stroke="#20463C" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M40 76 Q34 74 30 78" stroke="#2AA981" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M92 76 Q98 74 102 78" stroke="#2AA981" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  )
}
