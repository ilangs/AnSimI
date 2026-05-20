// 부모 차단함 — 위험 SMS 자녀 검토 대기/완료 목록
//
// 상태별 표시:
//   pending  → 🔒 자녀 확인 대기 중 (텍스트 가리고 차단 표시)
//   approved → ✅ 안전 확인 완료 (원문 + 클릭 가능 링크)
//   reported → 🚨 위험 확정 (원문 삭제됨, 차단 영구)
//   expired  → ⏰ 24시간 만료 (원문 삭제됨)

import { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useBlockedMessages, BlockedMessage } from '@/hooks/useBlockedMessages';
import { extractUrls } from '@/utils/linkUtils';

function formatRelativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

// 클릭 가능 텍스트 (URL 부분만 링크화)
function ClickableText({ text }: { text: string }) {
  const urls = extractUrls(text);
  if (urls.length === 0) {
    return <Text style={styles.contentText}>{text}</Text>;
  }

  // URL 위치 기반으로 분할 렌더링
  let lastIdx = 0;
  const parts: { text: string; url?: string }[] = [];
  urls.forEach((url) => {
    const idx = text.indexOf(url, lastIdx);
    if (idx < 0) return;
    if (idx > lastIdx) parts.push({ text: text.slice(lastIdx, idx) });
    parts.push({ text: url, url });
    lastIdx = idx + url.length;
  });
  if (lastIdx < text.length) parts.push({ text: text.slice(lastIdx) });

  const handlePress = (url: string) => {
    Alert.alert(
      '링크 이동',
      `다음 주소로 이동하시겠어요?\n\n${url}`,
      [
        { text: '취소', style: 'cancel' },
        { text: '이동', onPress: () => Linking.openURL(url).catch(() => {}) },
      ]
    );
  };

  return (
    <Text style={styles.contentText}>
      {parts.map((p, i) =>
        p.url ? (
          <Text key={i} style={styles.linkText} onPress={() => handlePress(p.url!)}>
            {p.text}
          </Text>
        ) : (
          <Text key={i}>{p.text}</Text>
        )
      )}
    </Text>
  );
}

function BlockedCard({ item }: { item: BlockedMessage }) {
  const isPending = item.status === 'pending';
  const isApproved = item.status === 'approved';
  const isReported = item.status === 'reported';
  const isExpired = item.status === 'expired';

  const statusInfo = {
    pending: { icon: '🔒', label: '자녀 확인 대기 중', color: Colors.warning ?? '#F59E0B' },
    approved: { icon: '✅', label: '안전 확인 완료', color: Colors.safe ?? Colors.brand },
    reported: { icon: '🚨', label: '위험 확정 — 절대 클릭 금지', color: Colors.danger },
    expired: { icon: '⏰', label: '24시간 만료 (원문 삭제됨)', color: Colors.textSecondary },
  }[item.status];

  const riskBg = item.risk_level === '매우위험' ? Colors.dangerBg : (Colors.cautionBg ?? '#FEF3C7');

  return (
    <View style={[styles.card, { borderColor: statusInfo.color, backgroundColor: riskBg }]}>
      {/* 상단: 상태 + 위험도 */}
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { borderColor: statusInfo.color }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.icon} {statusInfo.label}
          </Text>
        </View>
        <Text style={styles.time}>{formatRelativeTime(item.created_at)}</Text>
      </View>

      {/* 발신자 정보 */}
      {item.sender_number && (
        <Text style={styles.sender}>발신: {item.sender_number}</Text>
      )}

      {/* 본문 영역 — 상태별 다른 표시 */}
      <View style={styles.body}>
        {isPending && (
          <View style={styles.maskedBox}>
            <Text style={styles.maskedIcon}>🔒</Text>
            <Text style={styles.maskedTitle}>본문이 가려져 있어요</Text>
            <Text style={styles.maskedDesc}>
              자녀가 안전을 확인하면 원문과 링크가 표시됩니다.
            </Text>
            <Text style={styles.previewLabel}>미리보기 (40자):</Text>
            <Text style={styles.previewText}>"{item.message_preview}"</Text>
          </View>
        )}

        {isApproved && item.content_text && (
          <View style={styles.approvedBox}>
            <Text style={styles.approvedHeader}>✅ 자녀가 안전을 확인했어요</Text>
            <ClickableText text={item.content_text} />
          </View>
        )}

        {isReported && (
          <View style={styles.reportedBox}>
            <Text style={styles.reportedHeader}>🚨 위험 확정 — 영구 차단</Text>
            <Text style={styles.reportedDesc}>
              자녀가 이 문자를 보이스피싱으로 신고했어요.{'\n'}
              <Text style={styles.bold}>절대 누르지 마세요!</Text>
            </Text>
            <Text style={styles.previewLabel}>미리보기:</Text>
            <Text style={styles.previewText}>"{item.message_preview}"</Text>
          </View>
        )}

        {isExpired && (
          <View style={styles.expiredBox}>
            <Text style={styles.expiredDesc}>
              자녀 확인 없이 24시간이 지나 원문이 자동 삭제되었어요.
            </Text>
            <Text style={styles.previewLabel}>미리보기:</Text>
            <Text style={styles.previewText}>"{item.message_preview}"</Text>
          </View>
        )}
      </View>

      {/* 위험도 + 키워드 */}
      <View style={styles.riskInfo}>
        <Text style={styles.riskScore}>
          위험도 {item.risk_score}점 ({item.risk_level})
        </Text>
        {item.keywords.length > 0 && (
          <Text style={styles.keywords} numberOfLines={1}>
            의심 키워드: {item.keywords.slice(0, 3).join(' · ')}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function BlockedInboxScreen() {
  const { blocked, pendingCount, isLoading, refresh } = useBlockedMessages();

  const renderItem = useCallback(
    ({ item }: { item: BlockedMessage }) => <BlockedCard item={item} />,
    []
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={blocked}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={Colors.brand} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>🛡️ 차단함</Text>
            <Text style={styles.subtitle}>
              안심이가 자동으로 차단한 위험 문자 목록이에요
            </Text>
            {pendingCount > 0 && (
              <View style={styles.pendingBanner}>
                <Text style={styles.pendingBannerText}>
                  ⏳ 자녀 확인 대기 중인 문자 {pendingCount}건
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyTitle}>차단된 문자가 없어요</Text>
            <Text style={styles.emptyDesc}>안전한 하루 보내세요</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 24, gap: 12 },

  header: { paddingBottom: 16, gap: 6 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },
  pendingBanner: {
    backgroundColor: (Colors as any).cautionBg ?? '#FEF3C7',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: (Colors as any).warning ?? '#F59E0B',
  },
  pendingBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: (Colors as any).warning ?? '#F59E0B',
  },

  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: Colors.white,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  time: { fontSize: 12, color: Colors.textSecondary },
  sender: { fontSize: 13, color: Colors.textSecondary },

  body: { gap: 8 },

  // pending: 가려진 박스
  maskedBox: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 14,
    gap: 6,
    alignItems: 'center',
  },
  maskedIcon: { fontSize: 32 },
  maskedTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  maskedDesc: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center' },

  // approved: 원문 표시
  approvedBox: { backgroundColor: Colors.white, borderRadius: 10, padding: 14, gap: 8 },
  approvedHeader: { fontSize: 13, fontWeight: '800', color: Colors.brand },
  contentText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22 },
  linkText: { color: '#2563EB', textDecorationLine: 'underline', fontWeight: '600' },

  // reported: 영구 차단
  reportedBox: { backgroundColor: Colors.dangerBg, borderRadius: 10, padding: 14, gap: 6 },
  reportedHeader: { fontSize: 14, fontWeight: '800', color: Colors.danger },
  reportedDesc: { fontSize: 13, color: Colors.textPrimary, lineHeight: 20 },
  bold: { fontWeight: '800', color: Colors.danger },

  // expired
  expiredBox: { backgroundColor: Colors.background, borderRadius: 10, padding: 14, gap: 6 },
  expiredDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },

  // 공통 미리보기
  previewLabel: {
    marginTop: 6,
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  previewText: { fontSize: 13, color: Colors.textPrimary, fontStyle: 'italic' },

  // 위험도/키워드
  riskInfo: { gap: 2, paddingTop: 4 },
  riskScore: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  keywords: { fontSize: 11, color: Colors.textSecondary },

  // empty
  empty: { alignItems: 'center', paddingVertical: 64, gap: 8 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptyDesc: { fontSize: 14, color: Colors.textSecondary },
});
