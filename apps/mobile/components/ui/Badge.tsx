import { View, Text, StyleSheet } from 'react-native';
import { RiskLevel } from '@/types';
import { getRiskConfig } from '@/constants/riskLevels';

interface BadgeProps {
  level: RiskLevel;
  score?: number;
}

export default function Badge({ level, score }: BadgeProps) {
  const config = getRiskConfig(level);

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }]}>
      <Text style={styles.icon}>{config.icon}</Text>
      <Text style={[styles.label, { color: config.textColor }]}>
        {config.label}
      </Text>
      {score !== undefined && (
        <Text style={[styles.score, { color: config.textColor }]}>
          {score}점
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  icon: { fontSize: 14 },
  label: { fontSize: 14, fontWeight: '700' },
  score: { fontSize: 12, opacity: 0.8 },
});
