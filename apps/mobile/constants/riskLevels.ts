import { RiskLevel, RiskLevelConfig } from '@/types';
import { Colors } from './colors';

export const RISK_LEVELS: Record<RiskLevel, RiskLevelConfig> = {
  '안전': {
    label: '안전',
    color: Colors.safe,
    bgColor: Colors.safeBg,
    textColor: Colors.safe,
    icon: '✅',
    minScore: 0,
    maxScore: 25,
    description: '안전한 문자예요',
  },
  '주의': {
    label: '주의',
    color: Colors.caution,
    bgColor: Colors.cautionBg,
    textColor: Colors.caution,
    icon: '⚠️',
    minScore: 26,
    maxScore: 50,
    description: '조금 주의가 필요한 문자예요',
  },
  '위험': {
    label: '위험',
    color: Colors.danger,
    bgColor: Colors.dangerBg,
    textColor: Colors.danger,
    icon: '🚨',
    minScore: 51,
    maxScore: 75,
    description: '사기일 가능성이 높은 문자예요',
  },
  '매우위험': {
    label: '매우위험',
    color: Colors.veryDanger,
    bgColor: Colors.veryDangerBg,
    textColor: Colors.veryDanger,
    icon: '🛑',
    minScore: 76,
    maxScore: 100,
    description: '보이스피싱 문자예요! 즉시 차단하세요',
  },
};

export function getRiskLevel(score: number): RiskLevel {
  if (score <= 25) return '안전';
  if (score <= 50) return '주의';
  if (score <= 75) return '위험';
  return '매우위험';
}

export function getRiskConfig(level: RiskLevel): RiskLevelConfig {
  return RISK_LEVELS[level];
}

// 알림 발송 임계값 (이 점수 이상이면 자녀에게 알림)
export const NOTIFY_THRESHOLD = 51;

// 평균 보이스피싱 피해액 (절약 추정액 계산용)
export const AVG_FRAUD_AMOUNT = 3_500_000;
