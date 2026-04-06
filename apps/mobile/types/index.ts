// ─── 사용자 ───────────────────────────────────────────────
export type UserRole = 'parent' | 'child';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string | null;
  phone: string | null;
  fcm_token: string | null;
  is_subscribed: boolean;
  created_at: string;
}

// ─── 가족 ─────────────────────────────────────────────────
export interface Family {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface FamilyMember {
  family_id: string;
  user_id: string;
  user?: User;
}

export interface FamilyWithMembers extends Family {
  members: FamilyMember[];
}

// ─── 위험도 ───────────────────────────────────────────────
export type RiskLevel = '안전' | '주의' | '위험' | '매우위험';

export interface RiskLevelConfig {
  label: RiskLevel;
  color: string;
  bgColor: string;
  textColor: string;
  icon: string;
  minScore: number;
  maxScore: number;
  description: string;
}

// ─── 분석 결과 ────────────────────────────────────────────
export interface AnalysisResult {
  score: number;
  level: RiskLevel;
  reasons: string[];
  keywords: string[];
  action: string;
}

export interface AnalyzedMessage {
  id: string;
  user_id: string;
  content: string;
  risk_score: number;
  risk_level: RiskLevel;
  reasons: string[];
  keywords: string[];
  action: string;
  is_blocked: boolean;
  created_at: string;
}

// ─── 알림 ─────────────────────────────────────────────────
export type AlertType = 'danger' | 'warning' | 'sos' | 'safe';

export interface Alert {
  id: string;
  family_id: string;
  sender_id: string;
  message_id: string | null;
  type: AlertType;
  is_read: boolean;
  created_at: string;
  message?: AnalyzedMessage;
  sender?: User;
}

// ─── API 요청/응답 ────────────────────────────────────────
export interface AnalyzeRequest {
  message: string;
  userId: string;
  familyId: string;
}

export interface AnalyzeResponse extends AnalysisResult {
  messageId: string;
}

export interface NotifyRequest {
  familyId: string;
  alertType: AlertType;
  messageId?: string;
  sosUserId?: string;
}

export interface ReportResponse {
  totalBlocked: number;
  highRiskCount: number;
  byDay: { date: string; count: number }[];
  byType: { type: string; count: number }[];
  savedAmount: number;
  aiInsight: string;
}

// ─── 인증 상태 ────────────────────────────────────────────
export interface AuthState {
  user: User | null;
  session: {
    access_token: string;
    refresh_token: string;
  } | null;
  family: Family | null;
  isLoading: boolean;
}

// ─── 주간 리포트 차트 데이터 ──────────────────────────────
export interface ChartDataPoint {
  date: string;
  count: number;
  label: string;
}
