import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { formatAmount } from '@/utils/formatter';
import WeeklyChart from '@/components/child/WeeklyChart';
import InsightCard from '@/components/child/InsightCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

type Period = 'week' | 'month';

async function fetchReport(familyId: string, period: Period) {
  const API_URL = process.env.EXPO_PUBLIC_API_URL!;
  const res = await fetch(`${API_URL}/report?familyId=${familyId}&period=${period}`);
  if (!res.ok) throw new Error('리포트 로드 실패');
  return res.json();
}

export default function ReportScreen() {
  const { family } = useAuthStore();
  const [period, setPeriod] = useState<Period>('week');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['report', family?.id, period],
    queryFn: () => fetchReport(family!.id, period),
    enabled: !!family?.id,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          📊 리포트
        </Text>
        {/* 기간 선택 */}
        <View style={styles.periodRow}>
          {(['week', 'month'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
              accessibilityRole="radio"
              accessibilityState={{ selected: period === p }}
            >
              <Text
                style={[
                  styles.periodBtnText,
                  period === p && styles.periodBtnTextActive,
                ]}
              >
                {p === 'week' ? '이번 주' : '이번 달'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 로딩 */}
        {isLoading && (
          <LoadingSpinner message="안심이가 리포트를 만들고 있어요..." />
        )}

        {/* 에러 */}
        {isError && !isLoading && (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>리포트를 불러오지 못했어요</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryBtnText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 데이터 있을 때 */}
        {data && !isLoading && (
          <>
            {/* AI 인사이트 카드 */}
            <InsightCard
              insight={data.aiInsight}
              totalBlocked={data.totalBlocked}
              savedAmount={data.savedAmount}
            />

            {/* 핵심 통계 3개 */}
            <View style={styles.statsRow}>
              <StatCard
                emoji="🛡️"
                label="차단 건수"
                value={`${data.totalBlocked}건`}
                color={Colors.brand}
              />
              <StatCard
                emoji="🚨"
                label="고위험"
                value={`${data.highRiskCount}건`}
                color={Colors.danger}
              />
              <StatCard
                emoji="💰"
                label="피해 방지"
                value={formatAmount(data.savedAmount)}
                color={Colors.caution}
              />
            </View>

            {/* 일별 차단 현황 차트 */}
            <WeeklyChart
              data={data.byDay ?? []}
              title={period === 'week' ? '이번 주 일별 차단 현황' : '이번 달 일별 차단 현황'}
            />

            {/* 문자 유형별 분포 */}
            {(data.byType ?? []).some((t: { count: number }) => t.count > 0) && (
              <View style={styles.typeSection}>
                <Text style={styles.typeTitle}>위험도별 분석 현황</Text>
                {(data.byType as { type: string; count: number }[])
                  .filter((t) => t.count > 0)
                  .map((t) => {
                    const colorMap: Record<string, string> = {
                      '안전': Colors.safe,
                      '주의': Colors.caution,
                      '위험': Colors.danger,
                      '매우위험': Colors.veryDanger,
                    };
                    const total = (data.byType as { count: number }[]).reduce((s, x) => s + x.count, 0);
                    const pct = total > 0 ? (t.count / total) * 100 : 0;
                    return (
                      <View key={t.type} style={styles.typeRow}>
                        <Text style={styles.typeLabel}>{t.type}</Text>
                        <View style={styles.typeBarTrack}>
                          <View
                            style={[
                              styles.typeBarFill,
                              {
                                width: `${pct}%`,
                                backgroundColor: colorMap[t.type] ?? Colors.brand,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.typeCount}>{t.count}건</Text>
                      </View>
                    );
                  })}
              </View>
            )}

            {/* 피해 방지 설명 */}
            {data.savedAmount > 0 && (
              <View style={styles.savingsBox}>
                <Text style={styles.savingsTitle}>💰 절약 추정액 계산 방법</Text>
                <Text style={styles.savingsDesc}>
                  보이스피싱 평균 피해액(₩350만원) × 차단 건수({data.totalBlocked}건)
                  {'\n'}= 약 {formatAmount(data.savedAmount)} 피해 예방
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  emoji,
  label,
  value,
  color,
}: {
  emoji: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={[statStyles.card, { borderTopColor: color }]}>
      <Text style={statStyles.emoji}>{emoji}</Text>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderTopWidth: 3,
    gap: 4,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  emoji: { fontSize: 24 },
  value: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  // 헤더
  header: {
    backgroundColor: Colors.white,
    padding: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  periodRow: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 3,
  },
  periodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  periodBtnActive: { backgroundColor: Colors.white },
  periodBtnText: { fontSize: 14, color: Colors.textTertiary, fontWeight: '600' },
  periodBtnTextActive: { color: Colors.brand },

  content: { padding: 16, gap: 14, paddingBottom: 32 },

  // 에러
  errorBox: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  errorIcon: { fontSize: 48 },
  errorText: { fontSize: 16, color: Colors.textSecondary },
  retryBtn: {
    backgroundColor: Colors.brand,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },

  // 통계 행
  statsRow: { flexDirection: 'row', gap: 10 },

  // 유형별
  typeSection: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 18,
    gap: 12,
  },
  typeTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeLabel: { width: 60, fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  typeBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: Colors.borderLight,
    borderRadius: 5,
    overflow: 'hidden',
  },
  typeBarFill: { height: '100%', borderRadius: 5 },
  typeCount: { width: 32, fontSize: 13, color: Colors.textSecondary, textAlign: 'right' },

  // 절약 박스
  savingsBox: {
    backgroundColor: Colors.cautionBg,
    borderRadius: 14,
    padding: 18,
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.caution,
  },
  savingsTitle: { fontSize: 14, fontWeight: '700', color: Colors.caution },
  savingsDesc: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
});
