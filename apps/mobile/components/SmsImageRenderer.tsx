// SmsImageRenderer — 부모 폰에서 SMS를 off-screen 이미지로 변환
// - 이미지 내 URL은 텍스트로만 표시 (클릭 불가)
// - 위험 URL은 빨간 하이라이트
// - 결과는 base64 PNG 메모리 내 보관 (파일 시스템 저장 없음)

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { Colors } from '@/constants/colors';

interface SmsImageRendererProps {
  smsText: string;
  dangerousUrls: string[];
  onCapture: (base64Image: string) => void;
  onError?: (err: Error) => void;
}

/**
 * SMS 텍스트를 토큰으로 분리 (URL 부분과 일반 텍스트 분리)
 * 위험 URL은 빨간 배경으로 렌더링
 */
function tokenize(text: string, dangerousUrls: string[]) {
  if (!text) return [];
  if (dangerousUrls.length === 0) return [{ type: 'text' as const, content: text }];

  // dangerous URLs를 정규식으로 escape
  const escaped = dangerousUrls.map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${escaped.join('|')})`, 'g');
  const parts = text.split(re);
  return parts.map((p) =>
    dangerousUrls.includes(p)
      ? ({ type: 'dangerUrl' as const, content: p })
      : ({ type: 'text' as const, content: p })
  );
}

export default function SmsImageRenderer({
  smsText,
  dangerousUrls,
  onCapture,
  onError,
}: SmsImageRendererProps) {
  const viewRef = useRef<View>(null);

  useEffect(() => {
    let cancelled = false;
    // 다음 프레임에서 캡처 (레이아웃 안정화 대기)
    const timer = setTimeout(async () => {
      try {
        if (!viewRef.current) return;
        const base64 = await captureRef(viewRef, {
          format: 'png',
          quality: 0.85,
          result: 'base64',
        });
        if (!cancelled) onCapture(base64);
      } catch (err) {
        if (!cancelled) {
          onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      }
    }, 100);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [smsText, dangerousUrls.join('|')]);

  const tokens = tokenize(smsText, dangerousUrls);

  return (
    // off-screen 컨테이너: 화면 밖에 위치하여 부모님 화면에 영향 없음
    <View style={styles.offScreen} pointerEvents="none">
      <View ref={viewRef} collapsable={false} style={styles.card}>
        <View style={styles.watermark}>
          <Text style={styles.watermarkText}>⚠️ 안심이가 링크를 보호하고 있습니다</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.smsText}>
            {tokens.map((t, i) =>
              t.type === 'dangerUrl' ? (
                <Text key={i} style={styles.dangerUrl}>
                  {t.content}
                </Text>
              ) : (
                <Text key={i}>{t.content}</Text>
              )
            )}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  offScreen: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    width: 360,
  },
  card: {
    width: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  watermark: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  watermarkText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '700',
  },
  body: { paddingVertical: 4 },
  smsText: {
    fontSize: 15,
    color: '#1A1A2E',
    lineHeight: 22,
  },
  dangerUrl: {
    backgroundColor: Colors?.danger ?? '#E24B4A',
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
