# 🛡️ 안심이 (AnSimI)

> **안심이가 지켜드릴게요** — AI 기반 노인·중장년 보이스피싱 방지 앱

[![Phase](https://img.shields.io/badge/Phase-9%20Complete-1D9E75)]()
[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-54-000020)]()
[![Status](https://img.shields.io/badge/Status-MVP%20Ready-success)]()

📖 **[사용자 설명서 보기 →](./USER_GUIDE.md)**

---

## 📌 개요

| 항목 | 내용 |
|---|---|
| 앱 이름 | 안심이 (AnSimI) |
| 플랫폼 | Android (iOS 빌드 가능) · React Native + Expo SDK 54 |
| 타겟 | 부모님 폰 설치 + 자녀가 구독·관리 |
| 핵심 기능 | OpenAI/Claude AI 보이스피싱 문자 분석 → 자녀 즉시 알림 |
| 자동화 | SMS 알림 자동 감지 (Android NotificationListenerService) |
| 수익 모델 | 자녀 월 구독 ₩2,900 (부모님 앱 영구 무료) |
| 개인정보 보호 | **Zero-Storage** — 문자 원문 미저장 (분석 결과만 저장) |

---

## 🏗️ 기술 스택

| 분류 | 기술 |
|---|---|
| Mobile | React Native 0.81 + Expo SDK 54 |
| 라우팅 | Expo Router v6 (파일 기반, typedRoutes) |
| 스타일 | NativeWind v4 (TailwindCSS) |
| 상태 관리 | Zustand 4 + TanStack Query v5 |
| 인증/DB | Supabase (Auth · PostgreSQL · Realtime · RLS) |
| AI 분석 | OpenAI `gpt-4o-mini` (실배포 시 Claude 전환) |
| URL 검증 | Google Safe Browsing API |
| 푸시 알림 | Expo Notifications + FCM |
| API 서버 | Vercel Serverless Functions + Cron |
| 결제 | 토스페이먼츠 정기결제 (₩2,900/월) |
| 네이티브 모듈 | Kotlin — NotificationListenerService (SMS 자동 감지) |

---

## 📁 프로젝트 구조

```
ansimi/
├── apps/mobile/                  # React Native 앱 (Expo Router)
│   ├── app/
│   │   ├── (parent)/             # 부모님 앱 (홈·위험문자·SOS·설정)
│   │   ├── (child)/              # 자녀 앱 (대시보드·문자분석·링크·리포트·설정)
│   │   ├── onboarding/           # 역할 선택·가족 연결·부모 동의
│   │   └── auth/                 # 로그인·회원가입 (이중동의)
│   ├── components/
│   │   ├── parent/               # SafeStatus·AlertCard·SosButton·AnalyzeResult
│   │   ├── child/                # FamilyCard·WeeklyStats·InsightCard
│   │   └── ui/                   # Badge·OfflineBanner·ErrorBoundary
│   ├── hooks/                    # useAnalyze·useFamily·useParentRealtime
│   ├── stores/                   # authStore·familyStore·alertStore (Zustand)
│   ├── services/                 # supabase·analyze·notification·payment
│   ├── plugins/                  # withShareIntent·withNotificationListener (커스텀)
│   ├── app.config.js             # Expo 설정 (실빌드 기준)
│   └── eas.json                  # EAS Build 프로파일
│
├── api/                          # Vercel Serverless (실제 배포 대상)
│   ├── analyze.ts                # POST /api/analyze   (OpenAI + Safe Browsing)
│   ├── notify.ts                 # POST /api/notify    (Expo Push 멀티캐스트)
│   ├── report.ts                 # GET  /api/report    (주간/월간 리포트)
│   ├── payment.ts                # POST /api/payment   (토스페이먼츠 3액션)
│   ├── health.ts                 # GET  /api/health
│   └── cron/billing.ts           # CRON /api/cron/billing (월별 자동갱신) ⭐ Phase 9
│
├── supabase/migrations/          # 001~008 SQL 마이그레이션
├── public/privacy.html           # 개인정보처리방침 공개 페이지
├── vercel.json                   # Vercel 라우팅 + 보안 헤더
├── crons.json                    # Vercel Cron 스케줄 (매월 1일)
├── app.json                      # ⚠️ 최소 파일 (실제 빌드는 apps/mobile/app.config.js)
└── USER_GUIDE.md                 # 📖 사용자 설명서
```

---

## 🚀 빠른 시작

### 1. 사전 준비

```bash
node -v                    # Node.js 20+ 필요
npm install -g eas-cli vercel
```

### 2. 환경변수 설정

루트에 `.env` 생성 후 아래 값 입력:

| 변수 | 획득 경로 |
|---|---|
| `OPENAI_API_KEY` | https://platform.openai.com (실배포 시 `ANTHROPIC_API_KEY` 권장) |
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `EXPO_PUBLIC_SUPABASE_URL` | (SUPABASE_URL과 동일) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | (SUPABASE_ANON_KEY와 동일) |
| `EXPO_PUBLIC_API_URL` | Vercel 배포 URL (예: `https://ansimi.vercel.app/api`) |
| `GOOGLE_SAFE_BROWSING_API_KEY` | Google Cloud Console |
| `TOSS_SECRET_KEY` | 토스페이먼츠 개발자센터 |
| `EXPO_PUBLIC_TOSS_CLIENT_KEY` | 토스페이먼츠 개발자센터 |
| `CRON_SECRET` | `openssl rand -base64 32` 로 생성 |
| `VERCEL_LOG_LEVEL` | `error` (로그 최소화) |

### 3. Supabase 마이그레이션

Supabase 대시보드 → SQL Editor에서 순서대로 실행:

```
supabase/migrations/001_users.sql
supabase/migrations/002_families.sql
supabase/migrations/003_messages.sql
supabase/migrations/004_alerts.sql
supabase/migrations/005_rls_verify.sql           ← RLS 강화 + subscriptions
supabase/migrations/006_zero_storage.sql         ← content NOT NULL 해제 + 자동삭제
supabase/migrations/007_consent_objections.sql   ← consent_logs + objections
supabase/migrations/008_remove_family_member.sql ← RPC remove_family_member ⭐
supabase/migrations/20260510_link_alerts.sql     ← 링크 차단 알림
```

또는 CLI:
```bash
supabase db push
```

### 4. 필수 자산 파일

```
apps/mobile/google-services.json        ← Firebase Android 설정
apps/mobile/assets/images/icon-1024.png ← 앱 아이콘
apps/mobile/assets/adaptive-icon.png    ← Android Adaptive 아이콘
apps/mobile/assets/splash.png           ← 스플래시 화면
apps/mobile/assets/notification-icon.png← 알림 아이콘
```

### 5. 모바일 앱 개발 실행

```bash
cd apps/mobile
npm install
npx expo start             # QR → Expo Go 또는 dev-client
```

### 6. API 로컬 실행

```bash
vercel dev                 # http://localhost:3000 (루트에서)
```

---

## 📦 빌드 & 배포

### 모바일 앱 빌드 (APK / AAB)

루트에서 한 줄 명령:

```bash
npm run build:android          # APK (사이드로드 설치용, preview 프로파일)
npm run build:android:prod     # AAB (Google Play 제출용)
npm run build:ios              # iOS preview 빌드
npm run build:all              # Android + iOS 동시
```

빌드 완료 후 EAS가 제공하는 다운로드 URL을 카톡 등으로 공유 가능합니다.

### 백엔드 API 배포

```bash
# 환경변수 등록 (최초 1회)
vercel env add OPENAI_API_KEY
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add TOSS_SECRET_KEY
vercel env add GOOGLE_SAFE_BROWSING_API_KEY
vercel env add CRON_SECRET
vercel env add VERCEL_LOG_LEVEL          # → error

# 프로덕션 배포
vercel --prod
```

배포 완료 후 `.env`의 `EXPO_PUBLIC_API_URL`을 Vercel URL로 업데이트하고 앱 재빌드.

---

## 📞 API 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET`  | `/api/health` | 서버 상태 확인 |
| `POST` | `/api/analyze` | 문자 보이스피싱 분석 (AI + Safe Browsing URL 검증) |
| `POST` | `/api/notify` | Expo Push 멀티캐스트 알림 발송 |
| `GET`  | `/api/report` | 주간/월간 차단 리포트 |
| `POST` | `/api/payment?action=confirm` | 토스페이먼츠 결제 승인 (빌링키 발급) |
| `POST` | `/api/payment?action=billing` | 자동결제 실행 |
| `POST` | `/api/payment?action=cancel` | 구독 해지 |
| `POST` | `/api/cron/billing` | ⏰ 월별 자동갱신 (Cron, 매월 1일 00:00 UTC) |

---

## 🔐 보안·개인정보 체크리스트

### 코드 보안
- [x] `OPENAI_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — 서버사이드 전용
- [x] 클라이언트엔 `EXPO_PUBLIC_` 변수만 노출 (보안 감사 통과)
- [x] Supabase RLS 전 테이블 활성화
- [x] `family_members` DELETE는 SECURITY DEFINER RPC 경유 (멤버십 검증)
- [x] Vercel 보안 헤더 (`nosniff`, `no-store`, `DENY`, `no-referrer`)

### Zero-Storage 원칙 (개인정보처리방침 v2.0)
- [x] 문자 원문 메모리 외 미저장 (`content: null` 강제 + CHECK 제약)
- [x] AI 호출 즉시 변수 파기 + `finally` 이중 보장
- [x] `analyzed_messages` 1년 자동 삭제 트리거
- [x] ZDR(Zero Data Retention) 헤더 전송 (Anthropic 사용 시)

### 동의·이용약관
- [x] 회원가입 5개 필수 체크박스 (수집·국외이전·면책·약관)
- [x] 부모님 전용 큰 글씨(24px+) 이중동의 화면
- [x] 오판정 이의신청 기능 (SLA 72시간)

---

## 🗺️ 개발 로드맵

- [x] **Phase 1** — 프로젝트 초기화 (구조·타입·인증·레이아웃)
- [x] **Phase 2** — AI 문자 분석 핵심 플로우 (위험도 4단계 UI)
- [x] **Phase 3** — 부모님 앱 완성 (Realtime·큰글씨·SOS 진동)
- [x] **Phase 4** — 자녀 앱 완성 (대시보드·온보딩·코드 UX)
- [x] **Phase 5** — 인프라·결제 (FCM·토스페이먼츠·RLS)
- [x] **Phase 6** — 보안 감사·ErrorBoundary
- [x] **Phase 7** — 개인정보처리방침 기술 적합성 (Zero-Storage)
- [x] **Phase 8** — 법적 대비 5대 항목 (이중동의·이의신청·합리적 SLA)
- [x] **Phase 9** — 월별 자동갱신 Cron + UI/UX 개선 + 가족 제거 RPC

### 🔜 향후 고려사항
- iOS APNs 인증서 설정
- 토스페이먼츠 실계정 전환 (`test_ck_` → `live_ck_`)
- Sentry 에러 모니터링 연동
- 만 14세 미만 연령 확인 로직
- Anthropic DPA 체결 (엔터프라이즈)

---

## 🆘 문제 해결 (Troubleshooting)

| 증상 | 해결 |
|---|---|
| EAS 빌드 시 `ENOENT: ./assets/adaptive-icon.png` | 루트가 아닌 `apps/mobile/`에서 실행 또는 `npm run build:android` 사용 |
| `.aab` 파일이 생성되어 폰 설치 불가 | `npm run build:android` (preview 프로파일) 사용 — APK 생성 |
| 가족 구성원 제거가 안 됨 | `008_remove_family_member.sql` 마이그레이션 미실행 |
| 푸시 알림 안 옴 | `fcm_token` 미저장 확인 + Expo Push 토큰 등록 확인 |
| SMS 자동 분석 안 됨 | Android 설정 → 알림 액세스 → 안심이 ON |

---

## 📄 라이선스 & 문의

- 라이선스: MIT (예정)
- 개인정보처리방침: [`/privacy`](https://ansimi.vercel.app/privacy)
- 사용자 설명서: [`USER_GUIDE.md`](./USER_GUIDE.md)

---

*안심이 v1.0 MVP · Phase 9 Complete · 2026.05*
