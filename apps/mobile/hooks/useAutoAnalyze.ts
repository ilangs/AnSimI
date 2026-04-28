import { useEffect, useState, useCallback } from 'react';
import { NativeModules, Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import { useAuthStore } from '@/stores/authStore';

const { AnsimiModule } = NativeModules;
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

/**
 * NotificationListenerService 자동 SMS 분석 훅
 *
 * - 로그인 시 userId/familyId/apiUrl을 SharedPreferences에 저장
 *   → Kotlin SmsNotificationListenerService가 읽어서 API 호출에 사용
 * - 로그아웃 시 자격증명 삭제
 * - 권한 확인 / 설정 화면 열기 함수 제공
 *
 * openSettings: expo-intent-launcher 사용 → NativeModule 없어도 동작
 * checkPermission: AnsimiModule.isNotificationListenerEnabled 사용
 *   (새 빌드 설치 전에는 항상 false 반환 — 정상 동작)
 */
export function useAutoAnalyze() {
  const { user, family } = useAuthStore();
  const [isEnabled, setIsEnabled] = useState(false);

  // 로그인 상태 변경 시 Kotlin 서비스용 자격증명 동기화
  useEffect(() => {
    if (Platform.OS !== 'android' || !AnsimiModule) return;
    if (user?.id && family?.id) {
      AnsimiModule.saveCredentials(user.id, family.id, API_URL).catch(() => {});
    } else {
      AnsimiModule.clearCredentials().catch(() => {});
    }
  }, [user?.id, family?.id]);

  // 권한 상태 확인 (AnsimiModule 필요 — 새 빌드 후 정상 동작)
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

  // 알림 접근 설정 화면 열기 — expo-intent-launcher 사용 (NativeModule 불필요)
  const openSettings = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    try {
      await IntentLauncher.startActivityAsync(
        'android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS'
      );
      // 설정 화면에서 돌아왔을 때 권한 상태 재확인
      await checkPermission();
    } catch {
      // 일부 기기에서 fallback
      try {
        await IntentLauncher.startActivityAsync(
          'android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS'
        );
      } catch {}
    }
  }, [checkPermission]);

  return { isEnabled, checkPermission, openSettings };
}
