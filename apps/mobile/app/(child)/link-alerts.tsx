// 자녀 앱: 부모 폰 위험 링크 알림 + 차단 문자 검토 화면
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useLinkApproval, LinkAlert } from '@/hooks/useLinkApproval';
import { useBlockedMessages, BlockedMessage } from '@/hooks/useBlockedMessages';
import { useOcrAnalysis } from '@/hooks/useOcrAnalysis';
import LinkAlertCard from '@/components/LinkAlertCard';
import BlockedMessageReviewCard from '@/components/BlockedMessageReviewCard';

export default function LinkAlertsScreen() {
  const {
    alerts,
    pendingCount,
    isLoading,
    refresh,
    approveLink,
    reportLink,
    openKisaReport,
  } = useLinkApproval();
  const {
    blocked,
    pendingCount: blockedPending,
    isLoading: blockedLoading,
    refresh: refreshBlocked,
    approveMessage,
    reportMessage,
  } = useBlockedMessages();
  const { analyzeImage } = useOcrAnalysis();
  const [imageMap] = useState<Map<string, string>>(new Map());

  // 차단 메시지 중 pending 만 검토 화면에 표시
  const pendingBlocked = blocked.filter((b) => b.status === 'pending');

  // pull-to-refresh 시 두 소스 모두 갱신
  const handleRefresh = useCallback(async () => {
    await Promise.all([refresh(), refreshBlocked()]);
  }, [refresh, refreshBlocked]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = alerts.filter(
    (a) => new Date(a.created_at).getTime() >= today.getTime()
  ).length;
  const todayHigh = alerts.filter(
    (a) =>
      new Date(a.created_at).getTime() >= today.getTime() && a.risk_level === 'high'
  ).length;

  const handleOcr = useCallback(
    async (base64: string): Promise<string> => {
      return analyzeImage(base64);
    },
    [analyzeImage]
  );

  const renderItem = useCallback(
    ({ item }: { item: LinkAlert }) => (
      <LinkAlertCard
        alertId={item.id}
        riskLevel={item.risk_level}
        imageBase64={imageMap.get(item.id)}
        messagePreview={item.message_preview ?? ''}
        maliciousCount={item.malicious_count}
        safeBrowsingHit={item.safe_browsing_hit}
        createdAt={item.created_at}
        senderNumber={item.sender_number ?? undefined}
        status={item.status}
        onApprove={(id) => approveLink(id)}
        onReport={(id) => reportLink(id)}
        onOcrRequest={handleOcr}
      />
    ),
    [imageMap, approveLink, reportLink, handleOcr]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || blockedLoading}
            onRefresh={handleRefresh}
            tintColor={Colors.brand}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.title}>부모님 폰 보호 센터</Text>
              <Text style={styles.summary}>
                오늘 감지 {todayCount}건 / 위험 {todayHigh}건
              </Text>
              {(pendingCount > 0 || blockedPending > 0) && (
                <View style={styles.pendingBox}>
                  <Text style={styles.pendingText}>
                    ⏳ 확인 대기: 링크 {pendingCount}건 · 차단 문자 {blockedPending}건
                  </Text>
                </View>
              )}
              <TouchableOpacity onPress={openKisaReport} style={styles.kisaBtn}>
                <Text style={styles.kisaText}>🚨 KISA 보호나라 신고 페이지</Text>
              </TouchableOpacity>
            </View>

            {/* 차단 문자 검토 섹션 */}
            {pendingBlocked.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  🛡️ 차단된 문자 검토 ({pendingBlocked.length}건)
                </Text>
                <Text style={styles.sectionDesc}>
                  부모님 폰에서 자동 차단된 위험 문자에요. 검토 후 결정해주세요.
                </Text>
                <View style={styles.blockedList}>
                  {pendingBlocked.map((item) => (
                    <BlockedMessageReviewCard
                      key={item.id}
                      item={item}
                      onApprove={approveMessage}
                      onReport={reportMessage}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* 링크 알림 섹션 헤더 */}
            {alerts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔗 링크 알림</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          pendingBlocked.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🛡️</Text>
              <Text style={styles.emptyTitle}>오늘 위험 문자가 없었어요</Text>
              <Text style={styles.emptyDesc}>부모님 폰이 안전합니다</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 32 },
  header: {
    padding: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  summary: { fontSize: 14, color: Colors.textSecondary, marginBottom: 10 },
  pendingBox: {
    backgroundColor: Colors.cautionBg,
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  pendingText: { fontSize: 13, color: Colors.warning, fontWeight: '700' },
  kisaBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.dangerBg,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  kisaText: { fontSize: 13, color: Colors.danger, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 64, gap: 8 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptyDesc: { fontSize: 14, color: Colors.textSecondary },

  // 섹션 헤더
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 4,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  sectionDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  blockedList: { paddingTop: 8, gap: 10 },
});
