import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AnalyzeResponse } from '@/types';
import { getRiskConfig } from '@/constants/riskLevels';
import { Colors } from '@/constants/colors';
import Badge from '@/components/ui/Badge';

interface AnalyzeResultProps {
  result: AnalyzeResponse;
  originalText: string;
}

export default function AnalyzeResult({ result, originalText }: AnalyzeResultProps) {
  const config = getRiskConfig(result.level);

  const summaryMap = {
    '안전':    { emoji: '✅', headline: '안전한 문자예요', desc: '특별히 의심스러운 내용이 없어요.' },
    '주의':    { emoji: '⚠️', headline: '조금 주의하세요', desc: '일부 의심되는 부분이 있어요. 신중하게 확인하세요.' },
    '위험':    { emoji: '🚨', headline: '위험한 문자일 수 있어요', desc: '보이스피싱 가능성이 높아요. 무시하세요.' },
    '매우위험': { emoji: '🛑', headline: '이 문자는 사기예요!', desc: '즉시 차단하고 자녀에게 알리세요.' },
  }[result.level];

  return (
    <View style={styles.container}>
      {/* 핵심 결과 카드 */}
      <View style={[styles.heroCard, { borderColor: config.color, backgroundColor: config.bgColor }]}>
        <Text style={styles.heroEmoji}>{summaryMap.emoji}</Text>
        <Text style={[styles.heroHeadline, { color: config.color }]}>{summaryMap.headline}</Text>
        <Text style={styles.heroDesc}>{summaryMap.desc}</Text>

        {/* 위험도 점수 바 */}
        <View style={styles.scoreSection}>
          <View style={styles.scoreHeader}>
            <Text style={styles.scoreLabel}>위험도 점수</Text>
            <Badge level={result.level} score={result.score} />
          </View>
          <View style={styles.scoreBarTrack}>
            <View
              style={[
                styles.scoreBarFill,
                {
                  width: `${result.score}%`,
                  backgroundColor: config.color,
                },
              ]}
            />
          </View>
          <View style={styles.scoreRange}>
            <Text style={styles.scoreRangeText}>0 안전</Text>
            <Text style={styles.scoreRangeText}>100 매우위험</Text>
          </View>
        </View>
      </View>

      {/* AI 판별 이유 */}
      {result.reasons.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 안심이가 이렇게 판단했어요</Text>
          <View style={styles.reasonList}>
            {result.reasons.map((reason, i) => (
              <View key={i} style={styles.reasonItem}>
                <View style={[styles.reasonDot, { backgroundColor: config.color }]} />
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 의심 키워드 */}
      {result.keywords.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔑 의심 키워드</Text>
          <View style={styles.keywordRow}>
            {result.keywords.map((kw, i) => (
              <View key={i} style={[styles.keyword, { backgroundColor: config.bgColor }]}>
                <Text style={[styles.keywordText, { color: config.color }]}>{kw}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 권장 대처 */}
      <View style={[styles.actionBox, { borderLeftColor: config.color }]}>
        <Text style={styles.actionLabel}>✅ 권장 대처 방법</Text>
        <Text style={styles.actionText}>{result.action}</Text>
      </View>

      {/* 원문 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📄 분석한 문자 원문</Text>
        <View style={styles.originalBox}>
          <Text style={styles.originalText}>{originalText}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },

  // 히어로 카드
  heroCard: {
    borderRadius: 20,
    borderWidth: 2,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  heroEmoji: { fontSize: 64 },
  heroHeadline: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  heroDesc: { fontSize: 17, color: Colors.textSecondary, textAlign: 'center', lineHeight: 26 },

  // 점수 바
  scoreSection: { width: '100%', gap: 8, marginTop: 8 },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  scoreBarTrack: {
    width: '100%',
    height: 12,
    backgroundColor: Colors.borderLight,
    borderRadius: 6,
    overflow: 'hidden',
  },
  scoreBarFill: { height: '100%', borderRadius: 6 },
  scoreRange: { flexDirection: 'row', justifyContent: 'space-between' },
  scoreRangeText: { fontSize: 11, color: Colors.textTertiary },

  // 섹션 공통
  section: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 18,
    gap: 12,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },

  // 판별 이유
  reasonList: { gap: 10 },
  reasonItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  reasonDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  reasonText: { flex: 1, fontSize: 16, color: Colors.textPrimary, lineHeight: 24 },

  // 의심 키워드
  keywordRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  keyword: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  keywordText: { fontSize: 14, fontWeight: '700' },

  // 대처 방법
  actionBox: {
    backgroundColor: Colors.brandLight,
    borderRadius: 14,
    padding: 18,
    borderLeftWidth: 4,
    gap: 6,
  },
  actionLabel: { fontSize: 14, fontWeight: '700', color: Colors.brand },
  actionText: { fontSize: 18, color: Colors.textPrimary, lineHeight: 28 },

  // 원문
  originalBox: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 14,
  },
  originalText: { fontSize: 16, color: Colors.textSecondary, lineHeight: 26 },
});
