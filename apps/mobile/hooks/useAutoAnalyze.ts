import { useEffect, useState, useCallback } from 'react';
import { NativeModules, Platform } from 'react-native';
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

  const openSettings = useCallback(async () => {
    if (Platform.OS !== 'android' || !AnsimiModule) return;
    await AnsimiModule.openNotificationListenerSettings().catch(() => {});
  }, []);

  return { isEnabled, checkPermission, openSettings };
}
