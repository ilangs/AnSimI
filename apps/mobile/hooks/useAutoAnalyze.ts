import { useEffect, useState, useCallback, useRef } from 'react';
import { NativeModules, Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import { useAuthStore } from '@/stores/authStore';
import { extractUrls, extractDomainHint } from '@/utils/linkUtils';
import { supabase } from '@/services/supabase';

const { AnsimiModule } = NativeModules;
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

/**
 * NotificationListenerService 자동 SMS 분석 훅
 *
 * - 로그인 시 userId/familyId/apiUrl을 SharedPreferences에 저장
 *   → Kotlin SmsNotificationListenerService가 읽어서 API 호출에 사용
 * - 로그아웃 시 자격증명 삭제
 * - 권한 확인 / 설정 화면 열기 함수 제공
 * - processIncomingMessage: 부모 폰 포어그라운드에서 SMS 처리 (URL 감지 → 이미지 렌더링 → link_alerts INSERT)
 *   기존 분석 흐름은 그대로 유지, URL 감지는 추가 레이어
 */
export function useAutoAnalyze() {
  const { user, family } = useAuthStore();
  const [isEnabled, setIsEnabled] = useState(false);
  const pendingImageRef = useRef<{
    smsText: string;
    urls: string[];
    onCapture: (b64: string) => void;
  } | null>(null);

  // 로그인 상태 변경 시 Kotlin 서비스용 자격증명 동기화
  useEffect(() => {
    if (Platform.OS !== 'android' || !AnsimiModule) return;
    if (user?.id && family?.id) {
      AnsimiModule.saveCredentials(user.id, family.id, API_URL).catch(() => {});
    } else {
      AnsimiModule.clearCredentials().catch(() => {});
    }
  }, [user?.id, family?.id]);

  // 권한 상태 확인
  const checkPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !AnsimiModule) return false;
    try {
      const enabled: boolean = await AnsimiModule.isNotificationListenerEnabled();
      setIsEnabled(enabled);
      return enabled;
    } catch {
      return false;
    }
  }, []);

  // 알림 접근 설정 화면 열기
  const openSettings = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    try {
      await IntentLauncher.startActivityAsync(
        'android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS'
      );
      await checkPermission();
    } catch {
      try {
        await IntentLauncher.startActivityAsync(
          'android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS'
        );
      } catch {}
    }
  }, [checkPermission]);

  /**
   * 부모 폰 포어그라운드에서 SMS 한 건 처리
   * - URL이 있으면 analyze API에 urls 함께 전달
   * - 위험도 medium/high면 SmsImageRenderer로 이미지 캡처 후 link_alerts INSERT + 자녀 FCM 알림
   * - 기존 일반 분석 알림은 그대로 발송됨 (analyze API가 처리)
   */
  const processIncomingMessage = useCallback(
    async (
      smsText: string,
      opts?: {
        senderNumber?: string;
        renderImage?: (smsText: string, urls: string[]) => Promise<string | null>;
      }
    ) => {
      if (!user?.id || !family?.id || user.role !== 'parent') return;

      const urls = extractUrls(smsText);
      if (urls.length === 0) return; // URL 없으면 기존 흐름 그대로

      let analysis: any = null;
      try {
        const res = await fetch(`${API_URL}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: smsText,
            userId: user.id,
            familyId: family.id,
            urls,
          }),
        });
        if (res.ok) analysis = await res.json();
      } catch (err) {
        console.error('processIncomingMessage analyze 오류:', err);
        return;
      }
      if (!analysis) return;

      const score: number = analysis.score ?? 0;
      // 51 이상이면 위험 알림 (analyze API가 일반 알림을 이미 발송하므로 link 알림은 별도 추가)
      if (score < 51) return;

      const riskLevel: 'high' | 'medium' | 'low' = score >= 76 ? 'high' : score >= 51 ? 'medium' : 'low';
      const messagePreview = smsText.trim().slice(0, 40);
      const linkAnalysis = analysis.linkAnalysis ?? {};

      // 1. SmsImageRenderer로 off-screen 이미지 캡처 (호출자가 제공한 콜백 사용)
      let imageBase64: string | null = null;
      try {
        if (opts?.renderImage) {
          imageBase64 = await opts.renderImage(smsText, urls);
        }
      } catch (err) {
        console.error('이미지 렌더링 오류:', err);
      }

      // 2. link_alerts INSERT (URL 원문 미저장 — Zero-Storage)
      let alertId: string | null = null;
      try {
        const { data, error } = await supabase
          .from('link_alerts')
          .insert({
            parent_user_id: user.id,
            family_id: family.id,
            risk_level: riskLevel,
            malicious_count: linkAnalysis.maliciousCount ?? 0,
            safe_browsing_hit: linkAnalysis.safeBrowsingHit ?? false,
            domain_hint: urls[0] ? extractDomainHint(urls[0]) : null,
            message_preview: messagePreview,
            sender_number: opts?.senderNumber ?? null,
            status: 'pending',
          })
          .select()
          .single();
        if (error) {
          console.error('link_alerts insert 오류:', error);
        } else {
          alertId = data.id;
        }
      } catch (err) {
        console.error('link_alerts insert 예외:', err);
      }

      // 3. 자녀 폰에 link_danger 알림 발송
      try {
        await fetch(`${API_URL}/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            familyId: family.id,
            alertType: riskLevel === 'high' ? 'link_high_danger' : 'link_danger',
            alertId,
            riskLevel,
            maliciousCount: linkAnalysis.maliciousCount ?? 0,
            safeBrowsingHit: linkAnalysis.safeBrowsingHit ?? false,
            messagePreview,
            imageData: imageBase64 ?? undefined,
            targetRole: 'child',
          }),
        });
      } catch (err) {
        console.error('link_danger notify 오류:', err);
      }
    },
    [user?.id, user?.role, family?.id]
  );

  return {
    isEnabled,
    checkPermission,
    openSettings,
    processIncomingMessage,
  };
}
