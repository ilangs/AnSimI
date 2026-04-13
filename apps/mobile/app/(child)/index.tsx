import { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useAlertStore } from '@/stores/alertStore';
import { formatToday } from '@/utils/formatter';
import FamilyCard from '@/components/child/FamilyCard';
import AlertList from '@/components/child/AlertList';
import WeeklyStats from '@/components/child/WeeklyStats';
import { AVG_FRAUD_AMOUNT } from '@/constants/riskLevels';

export default function ChildDashboardScreen() {
  const router = useRouter();
  const { user, family } = useAuthStore();
  const { loadFamily, members } = useFamilyStore();
  const {
    alerts,
    unreadCount,
    isLoading,
    loadAlerts,
    markAllAsRead,
    subscribeToFamily,
  } = useAlertStore();

  // 초기 로드 + Realtime 구독
  useEffect(() => {
    if (!family?.id) return;
    loadFamily(family.id);
    loadAlerts(family.id);
    const unsubscribe = subscribeToFamily(family.id);
    return unsubscribe;
  }, [family?.id]);

  const handleRefresh = useCallback(() => {
    if (!family?.id) return;
    loadFamily(family.id);
    loadAlerts(family.id);
  }, [family?.id]);

  // 부모님 멤버만 필터
  const parents = members.filter((m) => m.user?.role === 'parent');

  // 위험 알림 배너 여부
  const hasDanger = alerts.some(
    (a) => !a.is_read && (a.type === 'danger' || a.type === 'sos')
  );

  // 이번 주 통계 (간이 계산)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekAlerts = alerts.filter(
    (a) => new Date(a.created_at) >= oneWeekAgo
  );
  const totalBlocked = weekAlerts.filter(
    (a) => a.type === 'danger' || a.type === 'warning'
  ).length;
  const highRiskCount = weekAlerts.filter((a) => {
    const score = a.message?.risk_score ?? 0;
    return score >= 76;
  }).length;

  // 각 부모님의 최신 알림
  const latestAlertByUser = (userId: string) =>
    alerts.find((a) => a.sender_id === userId);

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={alerts.slice(0, 30)}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={Colors.brand}
          />
        }
        ListHeaderComponent={
          <>
            {/* 헤더 */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title} accessibilityRole="header">
                  우리 가족 안심 현황
                </Text>
                <Text style={styles.date}>{formatToday()}</Text>
              </View>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{unreadCount}</Text>
                </View>
              )}
            </View>

            {/* 긴급 알림 배너 */}
            {hasDanger && (
              <TouchableOpacity
                style={styles.dangerBanner}
                onPress={() => markAllAsRead(family?.id ?? '')}
                accessibilityLabel={`긴급 위험 알림 ${unreadCount}건. 탭하여 확인`}
                accessibilityRole="button"
              >
                <Text style={styles.dangerBannerIcon}>🚨</Text>
                <Text style={styles.dangerBannerText}>
                  부모님께 위험한 문자가 도착했어요!
                </Text>
                <Text style={styles.dangerBannerAction}>확인 →</Text>
              </TouchableOpacity>
            )}

            {/* 부모님 현황 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>부모님 현황</Text>
              {parents.length === 0 ? (
                <View style={styles.emptyParents}>
                  <Text style={styles.emptyParentsIcon}>👴</Text>
                  <Text style={styles.emptyParentsTitle}>
                    부모님이 아직 연결되지 않았어요
                  </Text>
                  <Text style={styles.emptyParentsDesc}>
                    연결 코드:{' '}
                    <Text style={styles.codeText}>
                      {family?.code ?? '···'}
                    </Text>
                  </Text>
                  <Text style={styles.emptyParentsHint}>
                    부모님 앱에서 이 코드를 입력해주세요
                  </Text>
                </View>
              ) : (
                parents.map((m) => (
                  <FamilyCard
                    key={m.user_id}
                    member={m}
                    latestAlert={latestAlertByUser(m.user_id)}
                  />
                ))
              )}
            </View>

            {/* 이번 주 통계 */}
            {totalBlocked > 0 && (
              <View style={styles.section}>
                <WeeklyStats
                  totalBlocked={totalBlocked}
                  highRiskCount={highRiskCount}
                />
              </View>
            )}

            {/* 최근 알림 헤더 */}
            <View style={styles.section}>
              <View style={styles.alertHeader}>
                <Text style={styles.sectionTitle}>최근 알림</Text>
                {unreadCount > 0 && (
                  <TouchableOpacity
                    onPress={() => markAllAsRead(family?.id ?? '')}
                    accessibilityLabel="모든 알림 읽음 표시"
                  >
                    <Text style={styles.markAllRead}>모두 읽음</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </>
        }
        renderItem={null}
        ListFooterComponent={
          alerts.length > 0 ? (
            <AlertList alerts={alerts.slice(0, 30)} />
          ) : (
            <View style={styles.emptyAlerts}>
              <Text style={styles.emptyAlertsIcon}>🔔</Text>
              <Text style={styles.emptyAlertsText}>최근 알림이 없어요</Text>
            </View>
          )
        }
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 32 },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 14,
    backgroundColor: Colors.white,
  },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 3 },
  date: { fontSize: 13, color: Colors.textSecondary },
  unreadBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { color: Colors.white, fontSize: 14, fontWeight: '800' },

  // 긴급 배너
  dangerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerBg,
    borderWidth: 1.5,
    borderColor: Colors.danger,
    margin: 14,
    marginTop: 10,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  dangerBannerIcon: { fontSize: 24 },
  dangerBannerText: {
    flex: 1,
    fontSize: 15,
    color: Colors.danger,
    fontWeight: '700',
  },
  dangerBannerAction: { fontSize: 14, color: Colors.danger, fontWeight: '800' },

  // 섹션
  section: { paddingHorizontal: 14, marginTop: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },

  // 부모님 없음
  emptyParents: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyParentsIcon: { fontSize: 40 },
  emptyParentsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptyParentsDesc: { fontSize: 15, color: Colors.textSecondary },
  codeText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.brand,
    letterSpacing: 5,
  },
  emptyParentsHint: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center' },

  // 알림 헤더
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  markAllRead: { fontSize: 14, color: Colors.brand, fontWeight: '600' },

  // 알림 없음
  emptyAlerts: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyAlertsIcon: { fontSize: 40 },
  emptyAlertsText: { fontSize: 15, color: Colors.textTertiary },
});
