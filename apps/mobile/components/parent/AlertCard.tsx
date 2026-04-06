import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Alert as AlertType } from '@/types';
import { Colors } from '@/constants/colors';
import { getRiskConfig } from '@/constants/riskLevels';
import { formatDate, formatTime } from '@/utils/formatter';
import Badge from '@/components/ui/Badge';
import { supabase } from '@/services/supabase';
import { useAlertStore } from '@/stores/alertStore';

interface AlertCardProps {
  alert: AlertType;
}

export default function AlertCard({ alert }: AlertCardProps) {
  const [isBlocking, setIsBlocking] = useState(false);
  const [isAllowing, setIsAllowing] = useState(false);
  const [actionDone, setActionDone] = useState<'blocked' | 'allowed' | null>(null);
  const { markAsRead } = useAlertStore();

  const message = alert.message;
  if (!message) return null;

  const config = getRiskConfig(message.risk_level);

  const handleBlock = async () => {
    Alert.alert(
      '🚫 차단하기',
      '이 문자를 차단하고 위험 문자로 기록할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '차단',
          style: 'destructive',
          onPress: async () => {
            setIsBlocking(true);
            try {
              await supabase
                .from('analyzed_messages')
                .update({ is_blocked: true })
                .eq('id', message.id);
              await markAsRead(alert.id);
              setActionDone('blocked');
            } catch {
              Alert.alert('오류', '잠시 후 다시 시도해주세요');
            } finally {
              setIsBlocking(false);
            }
          },
        },
      ]
    );
  };

  const handleAllow = async () => {
    Alert.alert(
      '✅ 안전한 문자예요',
      '이 문자를 안전한 것으로 표시할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '안전해요',
          onPress: async () => {
            setIsAllowing(true);
            try {
              await supabase
                .from('analyzed_messages')
                .update({ is_blocked: false })
                .eq('id', message.id);
              await markAsRead(alert.id);
              setActionDone('allowed');
            } catch {
              Alert.alert('오류', '잠시 후 다시 시도해주세요');
            } finally {
              setIsAllowing(false);
            }
          },
        },
      ]
    );
  };

  // 조치 완료 상태 표시
  if (actionDone) {
    return (
      <View style={[styles.card, styles.cardDone, { borderLeftColor: actionDone === 'blocked' ? Colors.danger : Colors.safe }]}>
        <Text style={styles.doneIcon}>{actionDone === 'blocked' ? '🚫' : '✅'}</Text>
        <Text style={styles.doneText}>
          {actionDone === 'blocked' ? '차단 완료했어요' : '안전한 문자로 표시했어요'}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.card, { borderLeftColor: config.color }]}
      accessibilityLabel={`${message.risk_level} 위험 문자. ${formatDate(message.created_at)} ${formatTime(message.created_at)}`}
    >
      {/* 헤더: 뱃지 + 날짜 */}
      <View style={styles.header}>
        <Badge level={message.risk_level} score={message.risk_score} />
        <Text style={styles.date}>
          {formatDate(message.created_at)} {formatTime(message.created_at)}
        </Text>
      </View>

      {/* 문자 내용 */}
      <View style={[styles.messageBox, { backgroundColor: config.bgColor }]}>
        <Text style={styles.messageText} numberOfLines={4}>
          {message.content}
        </Text>
      </View>

      {/* AI 판별 이유 (최대 2개) */}
      {message.reasons.length > 0 && (
        <View style={styles.reasons}>
          <Text style={styles.reasonsTitle}>🤖 이렇게 판단했어요</Text>
          {message.reasons.slice(0, 2).map((reason, i) => (
            <Text key={i} style={styles.reason}>
              • {reason}
            </Text>
          ))}
        </View>
      )}

      {/* 권장 대처 */}
      <View style={styles.actionBox}>
        <Text style={styles.actionLabel}>✅ 권장 대처</Text>
        <Text style={styles.actionText}>{message.action}</Text>
      </View>

      {/* 의심 키워드 */}
      {message.keywords.length > 0 && (
        <View style={styles.keywords}>
          {message.keywords.slice(0, 5).map((kw, i) => (
            <View key={i} style={[styles.kwChip, { backgroundColor: config.bgColor }]}>
              <Text style={[styles.kwText, { color: config.color }]}>{kw}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 차단 / 안전 버튼 */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.btn, styles.blockBtn]}
          onPress={handleBlock}
          disabled={isBlocking || isAllowing}
          accessibilityLabel="이 문자를 차단하기"
          accessibilityRole="button"
        >
          {isBlocking ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.blockBtnText}>🚫 차단하기</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.allowBtn]}
          onPress={handleAllow}
          disabled={isBlocking || isAllowing}
          accessibilityLabel="안전한 문자로 표시"
          accessibilityRole="button"
        >
          {isAllowing ? (
            <ActivityIndicator color={Colors.textPrimary} />
          ) : (
            <Text style={styles.allowBtnText}>✅ 안전해요</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 20,
    borderLeftWidth: 5,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 4,
    gap: 14,
  },
  cardDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
    opacity: 0.7,
  },
  doneIcon: { fontSize: 28 },
  doneText: { fontSize: 18, color: Colors.textSecondary, fontWeight: '600' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: { fontSize: 13, color: Colors.textTertiary },

  messageBox: { borderRadius: 12, padding: 14 },
  messageText: { fontSize: 18, color: Colors.textPrimary, lineHeight: 28 },

  reasons: { gap: 6 },
  reasonsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  reason: { fontSize: 16, color: Colors.textPrimary, lineHeight: 24 },

  actionBox: {
    backgroundColor: Colors.brandLight,
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
  actionLabel: { fontSize: 14, fontWeight: '700', color: Colors.brand },
  actionText: { fontSize: 17, color: Colors.textPrimary, lineHeight: 26 },

  keywords: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kwChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  kwText: { fontSize: 14, fontWeight: '700' },

  buttons: { flexDirection: 'row', gap: 12 },
  btn: {
    flex: 1,
    height: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockBtn: { backgroundColor: Colors.danger },
  blockBtnText: { color: Colors.white, fontSize: 18, fontWeight: '800' },
  allowBtn: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  allowBtnText: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
});
