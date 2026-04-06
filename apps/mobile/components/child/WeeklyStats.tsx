import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { formatAmount } from '@/utils/formatter';
import { AVG_FRAUD_AMOUNT } from '@/constants/riskLevels';

interface WeeklyStatsProps {
  totalBlocked: number;
  highRiskCount: number;
}

export default function WeeklyStats({ totalBlocked, highRiskCount }: WeeklyStatsProps) {
  const savedAmount = totalBlocked * AVG_FRAUD_AMOUNT;

  return (
    <View style={styles.container} accessibilityLabel={`이번 주 통계: 차단 ${totalBlocked}건, 고위험 ${highRiskCount}건, 피해 방지 ${formatAmount(savedAmount)}`}>
      <Text style={styles.title}>이번 주 통계</Text>
      <View style={styles.row}>
        <StatItem emoji="🛡️" label="차단" value={`${totalBlocked}건`} color={Colors.brand} />
        <View style={styles.divider} />
        <StatItem emoji="🚨" label="고위험" value={`${highRiskCount}건`} color={Colors.danger} />
        <View style={styles.divider} />
        <StatItem emoji="💰" label="피해 방지" value={formatAmount(savedAmount)} color={Colors.caution} />
      </View>
    </View>
  );
}

function StatItem({
  emoji, label, value, color,
}: { emoji: string; label: string; value: string; color: string }) {
  return (
    <View style={itemStyles.container}>
      <Text style={itemStyles.emoji}>{emoji}</Text>
      <Text style={[itemStyles.value, { color }]}>{value}</Text>
      <Text style={itemStyles.label}>{label}</Text>
    </View>
  );
}

const itemStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', gap: 4 },
  emoji: { fontSize: 22 },
  value: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 11, color: Colors.textSecondary },
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    gap: 14,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  divider: { width: 1, height: 40, backgroundColor: Colors.borderLight },
});
