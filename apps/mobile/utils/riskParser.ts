import { AnalysisResult, RiskLevel } from '@/types';
import { getRiskLevel } from '@/constants/riskLevels';

const VALID_LEVELS: RiskLevel[] = ['안전', '주의', '위험', '매우위험'];

export function parseAnalysisResponse(raw: string): AnalysisResult {
  // JSON 블록 추출 (마크다운 코드 블록 처리)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI 응답에서 JSON을 찾을 수 없습니다');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // 필드 검증
  if (typeof parsed.score !== 'number' || parsed.score < 0 || parsed.score > 100) {
    throw new Error('유효하지 않은 위험도 점수');
  }

  const level: RiskLevel = VALID_LEVELS.includes(parsed.level)
    ? parsed.level
    : getRiskLevel(parsed.score);

  const reasons = Array.isArray(parsed.reasons)
    ? parsed.reasons.filter((r: unknown) => typeof r === 'string').slice(0, 5)
    : [];

  const keywords = Array.isArray(parsed.keywords)
    ? parsed.keywords.filter((k: unknown) => typeof k === 'string').slice(0, 10)
    : [];

  const action = typeof parsed.action === 'string'
    ? parsed.action.slice(0, 60)
    : '전문가에게 문의하세요';

  return {
    score: Math.round(parsed.score),
    level,
    reasons,
    keywords,
    action,
  };
}
