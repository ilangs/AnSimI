# 🛡️ 안심이 (AnsimI) — 세션 인수인계 요약
**신규 Claude.ai 세션 시작용 — 이 파일 전체를 첫 메시지로 붙여넣으세요**
*최초 작성: 2026.05.10 / 마지막 업데이트: 2026.05.10 (Claude Code 구축 완료 반영)*

---

## 👤 창업자 프로필
- 1인 창업자 / AI Agent Innovator 프로그램 수료 예정 (2026년 5월)
- 기술: Python, LangGraph, FastAPI, React Native, Supabase 기반 풀스택
- 목표: 구독형 SaaS 수익 → 소외 계층·어린이 병원 사회 기여
- 거점: 한국 인천

---

## 🎯 사업 개요 — 안심이 (AnsimI)

### 핵심 한 줄
> **AI로 부모님 수신 문자를 자동 분석해 보이스피싱을 감지하고 자녀에게 즉시 알리는 앱**

### 사업 구조
| 항목 | 내용 |
|---|---|
| 앱 이름 | 안심이 (AnsimI) · 슬로건: "안심이가 지켜드릴게요" |
| 글로벌 예비명 | KinShield (2년 후 전환) |
| 타겟 | 부모님 폰 설치 + 자녀가 관리·구독 (2인 1조 모델) |
| 수익 모델 | 자녀 월 ₩2,900 구독 / 부모님 앱 영구 무료 |
| 손익분기점 | 유료 46명 (매우 낮음) |
| 월 2,000명 시 | 순이익 약 656만원/월 |

### 3단계 확장 로드맵
```
Phase 1 (현재)  : 노인 특화 안심 앱 — 가족 구독  ← ✅ 구현 완료
Phase 2 (1년 후): AI 문자 내용 분석 고도화 + 로맨스 스캠 방지
Phase 3 (2년 후): B2B — 병원·복지관·지자체 납품 / KinShield 글로벌
```

---

## ✅ Claude Code 구축 완료 현황

### 핵심 기술 스택 (확정·구현 완료)
```
Mobile     : React Native + Expo SDK 54
라우팅     : Expo Router v4 (파일 기반, 역할별 분기)
상태관리   : Zustand + TanStack Query v5
DB/인증    : Supabase (PostgreSQL · Auth · Realtime)
AI 분석    : OpenAI gpt-4o-mini (실전 배포 시 Anthropic으로 전환 예정)
API 서버   : Vercel Serverless Functions
푸시알림   : Firebase FCM V1 + Expo Notifications (EAS 크리덴셜 등록 완료)
결제       : 토스페이먼츠 (코드 구현 완료, 실결제 테스트 미완료)
언어       : TypeScript 전체
배포       : Vercel (API) + EAS Build (앱 Preview APK 빌드 완료)
```

### Phase별 구현 상태

#### ✅ 인증 및 온보딩
- 회원가입 (역할 선택: 부모/자녀)
- 로그인 / 비밀번호 재설정 (딥링크 처리)
- 가족 연결 (코드 생성 · 입력)
- AuthGate (역할별 자동 라우팅)

#### ✅ 부모님 앱 (Parent)
- 홈 대시보드 (안전 상태 원형 + 오늘 차단 건수)
- 큰 빨간 SOS 버튼 → 자녀에게 즉시 푸시 알림 발송
- 문자 분석 화면 (텍스트 입력 → AI 위험도 분석)
- 주간 리포트
- 설정 (계정·가족 연결·개인정보·자동 분석 권한)

#### ✅ 자녀 앱 (Child)
- 홈 대시보드 (가족 안전 현황 + 최근 알림)
- **문자 분석 화면** (자녀도 직접 분석 가능 — 위험 감지 시 부모 자동 알림)
- 주간 리포트
- 설정 (계정·가족·알림·구독·자동 분석 권한)

#### ✅ AI 분석 엔진 (api/analyze.ts)
- OpenAI gpt-4o-mini 호출 → JSON 위험도 응답
- Zero-Storage 원칙 완전 구현 (원문 즉시 파기, DB null 저장)
- messagePreview 40자 추출 (알림 미리보기용, DB 미저장)
- **역할 기반 알림**: 부모 분석 → 자녀 알림 / 자녀 분석 → 부모 알림
- 2단계 Supabase 쿼리 (join 구문 silent fail 문제 해결)

#### ✅ 푸시 알림 시스템
- FCM V1 크리덴셜 EAS 등록 완료 (Firebase 서비스 계정 JSON 업로드)
- Expo Push API 정상 전송 확인
- 알림 미리보기 (문자 앞 40자) 정상 표시
- SOS 버튼 → 자녀 즉시 알림 (api/notify.ts)

#### ✅ Android Share Intent
- 커스텀 Expo Config Plugin (withShareIntent.js)
- ShareReceiverActivity.kt 자동 생성·등록
- 삼성 메시지 → [공유] → 안심이 선택 → 분석 화면 자동 입력
- 역할별 라우팅: 부모 → /(parent)/analyze / 자녀 → /(child)/analyze

#### ✅ NotificationListenerService (자동 SMS 분석)
- 커스텀 Expo Config Plugin (withNotificationListener.js)
- SmsNotificationListenerService.kt: 삼성·구글 메시지 앱 알림 자동 감지
- AnsimiModule.kt (NativeModule): SharedPreferences 저장/읽기
- AnsimiPackage.kt + MainApplication.kt 자동 패치
- useAutoAnalyze 훅: 로그인 시 자격증명 동기화
- 설정 화면: 권한 상태 표시 + expo-intent-launcher로 설정 이동
- **앱이 닫혀있어도 동작** (백그라운드 서비스)

#### ✅ 아이콘 및 앱 설정
- adaptive-icon.png (1024×1024, 원본) → 3종 자동 생성 (scripts/generate-icons.js)
- icon-1024.png (iOS/공통), icon-512.png (Android adaptive), icon-192.png (기본/파비콘)
- app.config.js 아이콘 경로 모두 업데이트 완료
- 루트 app.json: EAS projectId + Android package만 보관 (빌드 무관)

#### ✅ 기타
- 오프라인 배너 (네트워크 감지)
- 토스페이먼츠 구독 결제 코드 (실결제 테스트 미완료)
- 개인정보처리방침 페이지 (Vercel 배포)

---

## 🔧 핵심 파일 구조

```
C:\AnSimI\
├── api/
│   ├── analyze.ts          ← AI 분석 + 역할별 푸시 알림
│   └── notify.ts           ← SOS 알림
├── apps/mobile/
│   ├── app.config.js       ← 실제 빌드 설정 (이것만 수정)
│   ├── app/
│   │   ├── (parent)/       ← 부모님 앱 화면
│   │   │   ├── analyze.tsx ← 문자 분석
│   │   │   └── settings.tsx
│   │   ├── (child)/        ← 자녀 앱 화면
│   │   │   ├── analyze.tsx ← 자녀 문자 분석 (부모 알림)
│   │   │   └── settings.tsx
│   │   └── _layout.tsx     ← AuthGate + useShareIntent + useAutoAnalyze
│   ├── hooks/
│   │   ├── useShareIntent.ts   ← Share Intent 딥링크 처리
│   │   └── useAutoAnalyze.ts   ← NotificationListener 권한·자격증명
│   ├── plugins/
│   │   ├── withShareIntent.js        ← ShareReceiverActivity 자동 생성
│   │   └── withNotificationListener.js ← SmsNotificationListenerService 자동 생성
│   └── assets/
│       ├── adaptive-icon.png         ← 원본 아이콘
│       └── images/
│           ├── icon-1024.png
│           ├── icon-512.png
│           └── icon-192.png
└── scripts/
    └── generate-icons.js   ← 아이콘 3종 자동 생성 스크립트
```

---

## ⚠️ 알려진 이슈 및 주의사항

| 항목 | 내용 | 조치 |
|------|------|------|
| SMS 권한 | app.config.js에 RECEIVE_SMS·READ_SMS 잔존 | **Play Store 제출 전 반드시 제거** |
| Vercel 배포 | 한글 사용자명 CLI 크래시 | **git push로만 배포** (CLI 직접 배포 금지) |
| Supabase join | PostgREST join 구문 silent fail | **2단계 쿼리로 통일** (이미 수정) |
| iOS 빌드 | Apple Developer 계정 없음 | 상업화 시 $99/년 등록 |
| 결제 실테스트 | 토스페이먼츠 코드만 존재 | 사업자 등록 후 실결제 테스트 |
| 아이콘 텍스트 | adaptive-icon에 '안심이' 글자 포함 | 캐릭터만 원 안에 표시하도록 편집 필요 |

---

## 🚀 남은 작업 (우선순위순)

### 즉시 필요
- [ ] SMS 권한 제거 (RECEIVE_SMS, READ_SMS — Play Store 심사 거절 원인)
- [ ] 아이콘 이미지 편집 (하단 '안심이' 텍스트 제거, 캐릭터만 원 안에)
- [ ] Production AAB 빌드 (`eas build --platform android --profile production`)

### 배포 준비
- [ ] Google Play 개발자 계정 등록 ($25 일회성)
- [ ] Play Store 내부 테스트 → 비공개 → 공개 출시
- [ ] 스크린샷 최소 2장 준비
- [ ] APK 링크로 가족·지인 테스트 (무료, 즉시 가능)

### 상업화
- [ ] 토스페이먼츠 실결제 테스트 (사업자 등록 필요)
- [ ] Apple Developer 계정 ($99/년) + iOS 빌드
- [ ] NotificationListenerService 사용자 권한 안내 UX 개선
- [ ] README 작성

---

## 🔑 핵심 상수 참조

```typescript
// 브랜드 컬러
brand:   '#1D9E75'   // 메인 그린
dark:    '#1A1A2E'   // 다크 네이비
danger:  '#E24B4A'   // 위험 레드
warning: '#EF9F27'   // 주의 앰버

// EAS Project ID
"a63237c0-8f28-48c0-9437-d95e1d14034a"

// 앱 Bundle ID / Package
iOS     : com.ansimi.app
Android : com.ansimi.app

// AI 모델 (현재)
OpenAI gpt-4o-mini  (실전: claude-sonnet-4-5로 전환 예정)

// 구독 가격
₩2,900 / 월 (자녀)  |  무료 (부모님)

// 주요 URL
API     : https://an-sim-i.vercel.app/api
Privacy : https://an-sim-i.vercel.app/privacy
GitHub  : https://github.com/ilangs/AnSimI
Expo    : https://expo.dev/accounts/ilangs/projects/ansimi
```

---

## 💬 새 세션 시작 문구 예시

**전략 상의 이어가기 (Claude.ai)**
```
위 컨텍스트를 바탕으로 안심이 앱의 [주제]를 이어서 상의해 주세요.
```

**코딩 이어가기 (Claude Code)**
```
CLAUDE.md를 참고해서 안심이 앱 [작업 내용]을 진행해줘.
현재 완료 상태: ANSIMI_CONTEXT.md 참고
```
