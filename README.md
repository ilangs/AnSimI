# 🛡️ 안심이 (AnsimI)

> **안심이가 지켜드릴게요** — AI 기반 노인·중장년 보이스피싱 방지 앱

---

## 📌 개요

| 항목 | 내용 |
|---|---|
| 앱 이름 | 안심이 (AnsimI) |
| 플랫폼 | iOS + Android (React Native + Expo) |
| 타겟 | 부모님 폰 설치 + 자녀가 구독·관리 |
| 핵심 기능 | Claude AI 보이스피싱 문자 분석 → 자녀 즉시 알림 |
| 수익 모델 | 자녀 월 구독 ₩3,900 (부모님 앱 영구 무료) |

---

## 🏗️ 기술 스택

| 분류 | 기술 |
|---|---|
| Mobile | React Native + Expo SDK 51 |
| 라우팅 | Expo Router v3 (파일 기반) |
| 스타일 | NativeWind v4 (TailwindCSS) |
| 상태 관리 | Zustand + TanStack Query v5 |
| 인증/DB | Supabase (Auth · PostgreSQL · Realtime) |
| AI 분석 | Claude API (claude-sonnet-4-5) |
| 푸시 알림 | Expo Notifications + Firebase FCM |
| API 서버 | Vercel Serverless Functions |
| 결제 | 토스페이먼츠 (₩3,900/월) |

---

## 📁 프로젝트 구조

```
ansimi/
├── apps/
│   ├── mobile/                  # React Native 앱 (Expo Router)
│   │   ├── app/
│   │   │   ├── (parent)/        # 부모님 앱 탭 (홈·위험문자·SOS·분석)
│   │   │   ├── (child)/         # 자녀 앱 탭 (대시보드·리포트·설정)
│   │   │   ├── onboarding/      # 역할 선택·가족 연결 코드
│   │   │   └── auth/            # 로그인·회원가입
│   │   ├── components/
│   │   │   ├── parent/          # SafeStatus·AlertCard·SosButton·AnalyzeResult·...
│   │   │   ├── child/           # FamilyCard·AlertList·WeeklyChart·InsightCard·...
│   │   │   └── ui/              # Button·Badge·Card·LoadingSpinner·OfflineBanner·ErrorBoundary
│   │   ├── hooks/               # useAnalyze·useFamily·useNotification·useParentRealtime·...
│   │   ├── stores/              # authStore·familyStore·alertStore (Zustand)
│   │   ├── services/            # supabase·analyze·notification·payment
│   │   ├── constants/           # colors·riskLevels·prompts
│   │   ├── utils/               # riskParser·formatter
│   │   └── types/               # 공통 TypeScript 타입
│   └── api/                     # Vercel Serverless Functions
│       ├── analyze.ts           # POST /api/analyze  (Claude API 연동)
│       ├── notify.ts            # POST /api/notify   (FCM 멀티캐스트)
│       ├── report.ts            # GET  /api/report   (주간/월간 리포트)
│       ├── payment.ts           # POST /api/payment  (토스페이먼츠)
│       └── health.ts            # GET  /api/health
├── supabase/
│   ├── migrations/              # 001~007 SQL 마이그레이션
│   └── seed.sql
├── .env.example
├── vercel.json
└── README.md
```

---

## 🚀 로컬 실행 방법

### 1. 사전 준비

```bash
node -v          # Node.js 20+ 필요
npm install -g expo-cli eas-cli vercel
```

### 2. 환경변수 설정

```bash
cp .env
```

`.env`에 아래 값을 채워주세요:

| 변수 | 획득 경로 |
|---|---|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com |
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `EXPO_PUBLIC_SUPABASE_URL` | (SUPABASE_URL과 동일) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | (SUPABASE_ANON_KEY와 동일) |
| `FIREBASE_PROJECT_ID` | Firebase Console → 프로젝트 설정 |
| `FIREBASE_CLIENT_EMAIL` | Firebase Console → 서비스 계정 |
| `FIREBASE_PRIVATE_KEY` | Firebase Console → 서비스 계정 → 키 생성 |
| `TOSS_SECRET_KEY` | 토스페이먼츠 개발자센터 |
| `EXPO_PUBLIC_TOSS_CLIENT_KEY` | 토스페이먼츠 개발자센터 |
| `EXPO_PUBLIC_API_URL` | Vercel 배포 후 URL (로컬: `http://localhost:3000/api`) |

### 3. Supabase DB 마이그레이션

Supabase 대시보드 → SQL Editor에서 순서대로 실행:

```
supabase/migrations/001_users.sql
supabase/migrations/002_families.sql
supabase/migrations/003_messages.sql
supabase/migrations/004_alerts.sql
supabase/migrations/005_rls_verify.sql         ← RLS 강화 + subscriptions 테이블
supabase/migrations/006_zero_storage.sql       ← content NOT NULL 해제 + CHECK 제약
supabase/migrations/007_consent_objections.sql ← consent_logs + objections 테이블
```

### 4. 필수 파일 추가

```
apps/mobile/google-services.json     ← Firebase Android 설정
apps/mobile/assets/icon.png          ← 앱 아이콘 (1024×1024)
apps/mobile/assets/splash.png        ← 스플래시 (1284×2778)
apps/mobile/assets/adaptive-icon.png ← Android 아이콘 (1024×1024)
```

### 5. 모바일 앱 실행

```bash
cd apps/mobile
npm install
npx expo start          # QR 코드 → Expo Go 앱에서 스캔

# 시뮬레이터 직접 실행
npx expo start --ios
npx expo start --android
```

### 6. API 서버 로컬 실행

```bash
cd apps/api
npm install
vercel dev              # http://localhost:3000
```

---

## 🌐 Vercel 배포

```bash
cd apps/api

# 환경변수 등록
vercel env add ANTHROPIC_API_KEY
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add FIREBASE_PROJECT_ID
vercel env add FIREBASE_CLIENT_EMAIL
vercel env add FIREBASE_PRIVATE_KEY
vercel env add TOSS_SECRET_KEY

# 배포
vercel --prod
```

배포 완료 후 `.env`의 `EXPO_PUBLIC_API_URL`을 Vercel URL로 업데이트하세요.

---

## 📦 EAS Build (앱 빌드)

```bash
cd apps/mobile

# EAS 프로젝트 연결 (최초 1회)
eas init

# 개발 빌드 (실기기 테스트용)
eas build --platform android --profile development
eas build --platform ios     --profile development

# 스토어 제출용 빌드
eas build --platform all --profile production
```

---

## 📞 API 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET`  | `/api/health` | 서버 상태 확인 |
| `POST` | `/api/analyze` | 문자 보이스피싱 분석 (Claude AI) |
| `POST` | `/api/notify` | 자녀에게 FCM 푸시 알림 발송 |
| `GET`  | `/api/report` | 주간/월간 차단 리포트 |
| `POST` | `/api/payment?action=confirm` | 토스페이먼츠 결제 승인 |
| `POST` | `/api/payment?action=billing` | 자동결제 갱신 |
| `POST` | `/api/payment?action=cancel` | 구독 해지 |

---

## 🔐 보안 체크리스트

- [x] `ANTHROPIC_API_KEY` — 서버사이드(Vercel)에서만 사용
- [x] `SUPABASE_SERVICE_ROLE_KEY` — API 서버에서만 사용
- [x] 클라이언트 코드에 `EXPO_PUBLIC_` 이외 민감 변수 없음 (감사 통과)
- [x] Supabase RLS 전 테이블 활성화
- [x] FCM 만료 토큰 자동 정리

---

## 🗺️ 개발 로드맵

- [x] Phase 1: 프로젝트 초기화 (구조·타입·인증·레이아웃)
- [x] Phase 2: Claude API 문자 분석 핵심 플로우
- [x] Phase 3: 부모님 앱 완성 (Realtime·큰글씨·SOS 진동)
- [x] Phase 4: 자녀 앱 완성 (대시보드·설정·온보딩 코드 UX)
- [x] Phase 5: 인프라·결제 (FCM·토스페이먼츠·RLS)
- [x] Phase 6: 보안 감사·에러 처리·ErrorBoundary

---

*안심이 MVP v1.0 · 2026.04.04*
