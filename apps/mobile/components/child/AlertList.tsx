import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Alert } from '@/types';
import { Colors } from '@/constants/colors';
import { getRiskConfig } from '@/constants/riskLevels';
import { formatDate } from '@/utils/formatter';
import { useAlertStore } from '@/stores/alertStore';
import Badge from '@/components/ui/Badge';

interface AlertListProps {
  alerts: Alert[];
}

export default function AlertList({ alerts }: AlertListProps) {
  const { markAsRead } = useAlertStore();

  if (alerts.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🔔</Text>
        <Text style={styles.emptyText}>최근 알림이 없어요</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {alerts.map((alert) => (
        <AlertItem key={alert.id} alert={alert} onRead={markAsRead} />
      ))}
    </View>
  );
}

function AlertItem({ alert, onRead }: { alert: Alert; onRead: (id: string) => void }) {
  const typeConfig = {
    danger: { icon: '🚨', label: '매우위험', color: Colors.danger },
    warning: { icon: '⚠️', label: '위험', color: Colors.caution },
    sos: { icon: '🆘', label: 'SOS', color: Colors.danger },
    safe: { icon: '✅', label: '안전', color: Colors.safe },
  }[alert.type];

  return (
    <TouchableOpacity
      style={[styles.item, !alert.is_read && styles.itemUnread]}
      onPress={() => onRead(alert.id)}
      accessibilityLabel={`${typeConfig.label} 알림, ${formatDate(alert.created_at)}`}
    >
      <Text style={styles.itemIcon}>{typeConfig.icon}</Text>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: typeConfig.color }]}>
          {typeConfig.label}
          {!alert.is_read && <Text style={styles.newBadge}> NEW</Text>}
        </Text>
        <Text style={styles.itemDesc} numberOfLines={1}>
          {alert.message?.content ?? 'SOS 긴급 알림이 도착했어요'}
        </Text>
        <Text style={styles.itemTime}>{formatDate(alert.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: Colors.textTertiary },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  itemUnread: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.brand,
  },
  itemIcon: { fontSize: 28, marginTop: 2 },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  newBadge: { fontSize: 11, color: Colors.brand },
  itemDesc: { fontSize: 14, color: Colors.textSecondary, marginBottom: 4 },
  itemTime: { fontSize: 12, color: Colors.textTertiary },
});
