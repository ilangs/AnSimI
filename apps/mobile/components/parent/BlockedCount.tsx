import { View, Text, StyleSheet } from 'react-native';
import { useAlertStore } from '@/stores/alertStore';
import { Colors } from '@/constants/colors';

export default function BlockedCount() {
  const alerts = useAlertStore((s) => s.alerts);

  const today = new Date().toDateString();
  const todayBlocked = alerts.filter((a) => {
    const alertDate = new Date(a.created_at).toDateString();
    return alertDate === today && (a.type === 'danger' || a.type === 'warning');
  }).length;

  return (
    <View style={styles.container} accessibilityLabel={`오늘 차단 건수: ${todayBlocked}건`}>
      <View style={styles.card}>
        <Text style={styles.icon}>🛡️</Text>
        <View style={styles.textGroup}>
          <Text style={styles.label}>오늘 차단한 문자</Text>
          <View style={styles.countRow}>
            <Text style={styles.count}>{todayBlocked}</Text>
            <Text style={styles.unit}>건</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brandLight,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  icon: { fontSize: 40 },
  textGroup: { flex: 1 },
  label: { fontSize: 18, color: Colors.brand, fontWeight: '600', marginBottom: 4 },
  countRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  count: { fontSize: 48, fontWeight: '800', color: Colors.brand },
  unit: { fontSize: 22, color: Colors.brand, fontWeight: '600' },
});
