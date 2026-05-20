// 자녀 폰: 부모님 차단 문자 검토 카드
//
// pending 상태일 때만 표시됨 (검토 대기)
// 자녀가 [안전 확인] 또는 [위험 신고] 선택 → 부모 폰 차단함 자동 갱신

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { BlockedMessage } from '@/hooks/useBlockedMessages';

interface Props {
  item: BlockedMessage;
  onApprove: (id: string) => Promise<void>;
  onReport: (id: string) => Promise<void>;
}

function formatRelativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

export default function BlockedMessageReviewCard({ item, onApprove, onReport }: Props) {
  const [busy, setBusy] = useState<'approve' | 'report' | null>(null);

  const handleApprove = async () => {
    Alert.alert(
      '안전 확인',
      '이 문자가 안전하다고 확인하시겠어요?\n\n부모님 폰에 원문과 클릭 가능한 링크가 표시됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '안전 확인',
          onPress: async () => {
            setBusy('approve');
            try { await onApprove(item.id); } finally { setBusy(null); }
          },
        },
      ]
    );
  };

  const handleReport = async () => {
    Alert.alert(
      '위험 신고',
      '이 문자를 보이스피싱으로 신고하시겠어요?\n\n부모님 폰에 영구 차단 표시되고, 원문은 즉시 삭제됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '위험 신고',
          style: 'destructive',
          onPress: async () => {
            setBusy('report');
            try { await onReport(item.id); } finally { setBusy(null); }
          },
        },
      ]
    );
  };

  const riskColor = item.risk_level === '매우위험' ? Colors.danger : ((Colors as any).warning ?? '#F59E0B');
  const riskBg = item.risk_level === '매우위험' ? Colors.dangerBg : ((Colors as any).cautionBg ?? '#FEF3C7');

  return (
    <View style={[styles.card, { borderColor: riskColor, backgroundColor: riskBg }]}>
      {/* 상단 메타 */}
      <View style={styles.header}>
        <Text style={[styles.riskBadge, { color: riskColor }]}>
          🛡️ {item.risk_level} ({item.risk_score}점)
        </Text>
        <Text style={styles.time}>{formatRelativeTime(item.created_at)}</Text>
      </View>

      {item.sender_number && (
        <Text style={styles.sender}>발신: {item.sender_number}</Text>
      )}

      {/* 본문 (자녀는 원문 전체 볼 수 있음) */}
      <View style={styles.contentBox}>
        <Text style={styles.contentLabel}>부모님께 도착한 문자:</Text>
        <Text style={styles.contentText} selectable>
          {item.content_text ?? `(미리보기) ${item.message_preview}`}
        </Text>
      </View>

      {/* AI 판단 근거 */}
      {item.reasons.length > 0 && (
        <View style={styles.reasonsBox}>
          <Text style={styles.reasonsLabel}>AI 판단 근거:</Text>
          {item.reasons.slice(0, 3).map((r, i) => (
            <Text key={i} style={styles.reasonItem}>• {r}</Text>
          ))}
        </View>
      )}

      {/* 안내 */}
      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          🔒 부모님 폰에서는 현재 링크 클릭이 차단되어 있어요.{'\n'}
          확인 후 결정해주세요.
        </Text>
      </View>

      {/* 액션 버튼 */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.btn, styles.btnApprove, busy === 'approve' && styles.btnDisabled]}
          onPress={handleApprove}
          disabled={busy !== null}
        >
          {busy === 'approve'
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={[styles.btnText, { color: Colors.white }]}>✅ 안전 확인</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnReport, busy === 'report' && styles.btnDisabled]}
          onPress={handleReport}
          disabled={busy !== null}
        >
          {busy === 'report'
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={[styles.btnText, { color: Colors.white }]}>🚨 위험 신고</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    gap: 10,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  riskBadge: { fontSize: 14, fontWeight: '800' },
  time: { fontSize: 12, color: Colors.textSecondary },
  sender: { fontSize: 13, color: Colors.textSecondary },

  contentBox: { backgroundColor: Colors.white, borderRadius: 10, padding: 12, gap: 6 },
  contentLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  contentText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22 },

  reasonsBox: { backgroundColor: Colors.white, borderRadius: 10, padding: 12, gap: 4 },
  reasonsLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 4 },
  reasonItem: { fontSize: 13, color: Colors.textPrimary, lineHeight: 20 },

  notice: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.brand,
  },
  noticeText: { fontSize: 12, color: Colors.textPrimary, lineHeight: 18 },

  buttons: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  btnApprove: { backgroundColor: Colors.brand },
  btnReport: { backgroundColor: Colors.danger },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 14, fontWeight: '800' },
});
