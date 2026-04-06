import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/colors';

interface InsightCardProps {
  insight: string;
  isLoading?: boolean;
  totalBlocked?: number;
  savedAmount?: number;
}

export default function InsightCard({
  insight,
  isLoading,
  totalBlocked,
  savedAmount,
}: InsightCardProps) {
  return (
    <View style={styles.card}>
      {/* AI 인사이트 헤더 */}
      <View style={styles.header}>
        <View style={styles.avatarBadge}>
          <Text style={styles.avatarEmoji}>🤖</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>안심이의 한마디</Text>
          <Text style={styles.headerSubtitle}>이번 주 분석 리포트</Text>
        </View>
      </View>

      {/* 인사이트 텍스트 */}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={Colors.brand} />
          <Text style={styles.loadingText}>분석 중이에요...</Text>
        </View>
      ) : (
        <Text style={styles.insightText}>{insight}</Text>
      )}

      {/* 핵심 수치 */}
      {(totalBlocked !== undefined || savedAmount !== undefined) && (
        <View style={styles.stats}>
          {totalBlocked !== undefined && (
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalBlocked}건</Text>
              <Text style={styles.statLabel}>차단</Text>
            </View>
          )}
          {savedAmount !== undefined && savedAmount > 0 && (
            <View style={[styles.statItem, styles.statItemHighlight]}>
              <Text style={[styles.statValue, { color: Colors.brand }]}>
                {(savedAmount / 10000).toFixed(0)}만원
              </Text>
              <Text style={styles.statLabel}>절약 추정</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.brandLight,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.brand,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarEmoji: { fontSize: 24 },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.brand,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.brand + '99',
    marginTop: 2,
  },
  insightText: {
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 26,
    fontWeight: '500',
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.brand,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  statItem: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statItemHighlight: {
    borderWidth: 1,
    borderColor: Colors.brand + '40',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
