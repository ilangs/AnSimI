import { View, Text, StyleSheet } from 'react-native';
import { FamilyMember, User, Alert } from '@/types';
import { Colors } from '@/constants/colors';
import { formatDate } from '@/utils/formatter';
import { getRiskConfig } from '@/constants/riskLevels';

interface FamilyCardProps {
  member: FamilyMember & { user: User };
  latestAlert?: Alert;
}

export default function FamilyCard({ member, latestAlert }: FamilyCardProps) {
  const { user } = member;

  // 최근 미확인 위험 알림 여부
  const hasUnread = latestAlert && !latestAlert.is_read &&
    (latestAlert.type === 'danger' || latestAlert.type === 'sos');

  const statusConfig = hasUnread
    ? { color: Colors.danger, bg: Colors.dangerBg, label: '위험 감지', icon: '🚨' }
    : latestAlert?.type === 'warning'
    ? { color: Colors.caution, bg: Colors.cautionBg, label: '주의', icon: '⚠️' }
    : { color: Colors.safe, bg: Colors.safeBg, label: '안전', icon: '✅' };

  return (
    <View
      style={[
        styles.card,
        hasUnread && styles.cardDanger,
      ]}
      accessibilityLabel={`${user.name ?? '부모님'} 상태: ${statusConfig.label}. ${latestAlert ? `마지막 확인: ${formatDate(latestAlert.created_at)}` : '알림 없음'}`}
    >
      {/* 왼쪽: 아바타 */}
      <View style={[styles.avatar, { backgroundColor: statusConfig.bg }]}>
        <Text style={styles.avatarEmoji}>
          {user.role === 'parent' ? '👴' : '👨'}
        </Text>
      </View>

      {/* 중앙: 정보 */}
      <View style={styles.info}>
        <Text style={styles.name}>{user.name ?? '부모님'}</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusIcon}>{statusConfig.icon}</Text>
          <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
        {latestAlert && (
          <Text style={styles.lastSeen}>
            {formatDate(latestAlert.created_at)}
          </Text>
        )}
      </View>

      {/* 오른쪽: 상태 뱃지 */}
      <View style={[styles.badge, { backgroundColor: statusConfig.bg }]}>
        <Text style={[styles.badgeText, { color: statusConfig.color }]}>
          {statusConfig.label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    gap: 14,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardDanger: {
    borderColor: Colors.danger,
    borderWidth: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 26 },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusIcon: { fontSize: 14 },
  statusLabel: { fontSize: 14, fontWeight: '600' },
  lastSeen: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  badgeText: { fontSize: 13, fontWeight: '800' },
});
