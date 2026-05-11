// LinkAlertCard — 자녀 앱에 표시되는 부모 폰 위험 링크 알림 카드
// 자녀가 SMS 이미지를 검토하고 [재검사 / 안전 / 신고] 조치

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '@/constants/colors';

export interface LinkAlertCardProps {
  alertId: string;
  riskLevel: 'high' | 'medium' | 'low';
  imageBase64?: string;
  messagePreview: string;
  maliciousCount: number;
  safeBrowsingHit: boolean;
  createdAt: string;
  senderNumber?: string;
  status?: 'pending' | 'approved' | 'reported';
  onApprove: (alertId: string) => Promise<void>;
  onReport: (alertId: string) => Promise<void>;
  onOcrRequest: (imageBase64: string) => Promise<string>;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  } catch {
    return iso;
  }
}

const LEVEL_LABEL: Record<LinkAlertCardProps['riskLevel'], { label: string; color: string; bg: string }> = {
  high: { label: '🚨 위험', color: Colors.danger, bg: Colors.dangerBg },
  medium: { label: '⚠️ 주의', color: Colors.warning, bg: Colors.cautionBg },
  low: { label: '✅ 안전', color: Colors.brand, bg: Colors.brandLight },
};

export default function LinkAlertCard({
  alertId,
  riskLevel,
  imageBase64,
  messagePreview,
  maliciousCount,
  safeBrowsingHit,
  createdAt,
  senderNumber,
  status = 'pending',
  onApprove,
  onReport,
  onOcrRequest,
}: LinkAlertCardProps) {
  const [busy, setBusy] = useState<null | 'ocr' | 'approve' | 'report'>(null);
  const [ocrText, setOcrText] = useState<string | null>(null);

  const disabled = status !== 'pending' || busy !== null;
  const level = LEVEL_LABEL[riskLevel];

  const handleOcr = async () => {
    if (!imageBase64) return;
    setBusy('ocr');
    try {
      const text = await onOcrRequest(imageBase64);
      setOcrText(text);
    } catch (err) {
      console.error('OCR 실패:', err);
    } finally {
      setBusy(null);
    }
  };

  const handleApprove = async () => {
    setBusy('approve');
    try {
      await onApprove(alertId);
    } finally {
      setBusy(null);
    }
  };

  const handleReport = async () => {
    setBusy('report');
    try {
      await onReport(alertId);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.card}>
      {/* 출처 표시 */}
      <Text style={styles.source}>📱 부모님 폰에 수신된 문자</Text>

      {/* 위험도 배지 */}
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: level.bg }]}>
          <Text style={[styles.badgeText, { color: level.color }]}>{level.label}</Text>
        </View>
        {safeBrowsingHit && (
          <View style={[styles.badge, { backgroundColor: Colors.dangerBg }]}>
            <Text style={[styles.badgeText, { color: Colors.danger }]}>
              🛡️ Safe Browsing 매칭
            </Text>
          </View>
        )}
        {maliciousCount > 0 && !safeBrowsingHit && (
          <View style={[styles.badge, { backgroundColor: Colors.cautionBg }]}>
            <Text style={[styles.badgeText, { color: Colors.warning }]}>
              악성 URL {maliciousCount}건
            </Text>
          </View>
        )}
      </View>

      {/* SMS 이미지 (클릭 불가) */}
      {imageBase64 ? (
        <Image
          source={{ uri: `data:image/png;base64,${imageBase64}` }}
          style={styles.image}
          resizeMode="contain"
          accessible
          accessibilityLabel="부모 폰 SMS 캡처 이미지 (링크 클릭 불가)"
        />
      ) : (
        <View style={styles.imageFallback}>
          <Text style={styles.previewText}>"{messagePreview}"</Text>
        </View>
      )}

      {/* 시간 + 발신번호 */}
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{formatTime(createdAt)}</Text>
        {senderNumber && <Text style={styles.metaText}>발신: {senderNumber}</Text>}
      </View>

      {/* OCR 결과 */}
      {ocrText && (
        <View style={styles.ocrBox}>
          <Text style={styles.ocrTitle}>🔍 OCR 재검사 결과</Text>
          <Text style={styles.ocrText}>{ocrText}</Text>
        </View>
      )}

      {/* 액션 버튼 */}
      {status === 'pending' ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnOcr, busy === 'ocr' && styles.btnDisabled]}
            onPress={handleOcr}
            disabled={disabled || !imageBase64}
            accessibilityRole="button"
            accessibilityLabel="내용 재검사"
          >
            {busy === 'ocr' ? (
              <ActivityIndicator color={Colors.brand} size="small" />
            ) : (
              <Text style={[styles.btnText, { color: Colors.brand }]}>🔍 내용 재검사</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnApprove, busy === 'approve' && styles.btnDisabled]}
            onPress={handleApprove}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="안전 확인"
          >
            {busy === 'approve' ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={[styles.btnText, { color: Colors.white }]}>✅ 안전 확인</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnReport, busy === 'report' && styles.btnDisabled]}
            onPress={handleReport}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="위험 신고"
          >
            {busy === 'report' ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={[styles.btnText, { color: Colors.white }]}>🚨 위험 신고</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={[
            styles.completedBox,
            {
              backgroundColor: status === 'approved' ? Colors.brandLight : Colors.dangerBg,
            },
          ]}
        >
          <Text
            style={[
              styles.completedText,
              { color: status === 'approved' ? Colors.brand : Colors.danger },
            ]}
          >
            {status === 'approved' ? '✅ 안전 확인 완료' : '🚨 위험 신고 완료'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginVertical: 6,
    marginHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  source: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: Colors.borderLight,
    marginBottom: 8,
  },
  imageFallback: {
    padding: 14,
    backgroundColor: Colors.borderLight,
    borderRadius: 10,
    marginBottom: 8,
  },
  previewText: { fontSize: 14, color: Colors.textPrimary, fontStyle: 'italic' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  metaText: { fontSize: 12, color: Colors.textTertiary },
  ocrBox: {
    padding: 10,
    backgroundColor: Colors.brandLight,
    borderRadius: 8,
    marginBottom: 10,
  },
  ocrTitle: { fontSize: 12, fontWeight: '700', color: Colors.brand, marginBottom: 4 },
  ocrText: { fontSize: 13, color: Colors.textPrimary, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 6 },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  btnOcr: { backgroundColor: Colors.brandLight, borderWidth: 1, borderColor: Colors.brand },
  btnApprove: { backgroundColor: Colors.brand },
  btnReport: { backgroundColor: Colors.danger },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 13, fontWeight: '700' },
  completedBox: { padding: 12, borderRadius: 8, alignItems: 'center' },
  completedText: { fontSize: 14, fontWeight: '700' },
});
