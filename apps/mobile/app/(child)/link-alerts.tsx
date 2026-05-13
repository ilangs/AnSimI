// 자녀 앱: 부모 폰 위험 링크 알림 관리 화면
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
import { useOcrAnalysis } from '@/hooks/useOcrAnalysis';
import LinkAlertCard from '@/components/LinkAlertCard';

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
  const { analyzeImage } = useOcrAnalysis();
  const [imageMap] = useState<Map<string, string>>(new Map());

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
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={Colors.brand}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>부모님 폰 링크 알림</Text>
            <Text style={styles.summary}>
              오늘 감지 {todayCount}건 / 위험 {todayHigh}건
            </Text>
            {pendingCount > 0 && (
              <View style={styles.pendingBox}>
                <Text style={styles.pendingText}>
                  ⏳ 확인 대기 중인 알림 {pendingCount}건
                </Text>
              </View>
            )}
            <TouchableOpacity onPress={openKisaReport} style={styles.kisaBtn}>
              <Text style={styles.kisaText}>🚨 KISA 보호나라 신고 페이지</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyTitle}>오늘 위험 링크가 없었어요</Text>
            <Text style={styles.emptyDesc}>부모님 폰이 안전합니다</Text>
          </View>
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
});
