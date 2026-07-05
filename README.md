# aimgrim 🌱

가족이 함께 하루 계획을 세우고, 자녀가 해내면 별점(포인트)이 쌓이는 **우리집 일정 앱**.

부모와 자녀가 매일 스케줄을 함께 작성·관리하고, 자녀가 완료를 체크하면 별점이 오릅니다.
쌓인 별점은 자녀가 스스로 정한 목표로 이어져 동기를 만듭니다. 대상 연령 10~15세, 모바일 우선.

## 핵심 설계 원칙
- **순수 포인트('별점')** — 용돈/금융 연동 없음. 포인트는 '성취의 기록'으로 상징화.
- **스케줄 중심** — 오늘 / 이번주 / 이번달 목표와 할일 뷰.
- **부모의 격려가 중심** — 동기 연구상 포인트보다 격려가 더 안전. 순위표·형제 비교는 넣지 않음.
- **함께 만드는 일정** — 할일마다 누가 만들었는지(내가/엄마/아빠) 표시.

## 기술 스택
- **프론트엔드**: Vite + React + TypeScript (→ `dist/`, Cloudflare Pages 자동 배포)
- **백엔드**(예정): Cloudflare Pages Functions + D1 (SQLite)
- **네이티브 앱**(이후): Expo (React Native)

## 개발
```bash
npm install      # 의존성 설치
npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # 프로덕션 빌드 → dist/
npm run preview  # 빌드 결과 미리보기
```

## 배포
- GitHub: [hamsigi-lab/aimgrim](https://github.com/hamsigi-lab/aimgrim)
- Live: [aimgrim.pages.dev](https://aimgrim.pages.dev/) — `main` 브랜치 push 시 자동 배포
- Cloudflare Pages 빌드 설정: **빌드 명령** `npm run build`, **출력 디렉터리** `dist`

## 현재 상태 (MVP 진행 중)
- [x] 디자인 방향 확정 + 인터랙티브 목업
- [x] 프론트엔드 스캐폴딩 + 오늘/주/월/별점 화면 (목업 데이터)
- [ ] 데이터 모델 + D1 백엔드 + API
- [ ] 온보딩(가족 만들기 + 만14세 미만 법정대리인 동의)
- [ ] 일정 생성/편집 + 부모 승인 흐름
- [ ] Expo 네이티브 앱 포팅
