import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

/**
 * Android Share Intent 처리 훅
 * 삼성 메시지 앱 등에서 [공유] → 안심이 선택 시 분석 화면으로 이동하며 텍스트 자동 입력
 *
 * 동작 조건: 부모(parent) 계정으로 로그인된 상태에서만 활성화
 */
export function useShareIntent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!user || user.role !== 'parent') return;

    let ReceiveSharingIntent: any;
    try {
      ReceiveSharingIntent = require('react-native-receive-sharing-intent').default;
    } catch {
      // 패키지 미설치 환경(Expo Go 등)에서는 무시
      return;
    }

    const handleSharedFiles = (files: any[]) => {
      const sharedText = files?.[0]?.text ?? files?.[0]?.weblink ?? '';
      if (!sharedText) return;

      // 분석 화면으로 이동하며 공유 텍스트 전달
      router.push({
        pathname: '/(parent)/analyze',
        params: { sharedText: encodeURIComponent(sharedText) },
      });

      // 처리 후 초기화
      ReceiveSharingIntent.clearReceivedFiles();
    };

    const handleError = (err: any) => {
      console.warn('Share Intent 오류:', err);
    };

    // 앱이 Share Intent로 실행된 경우 (콜드 스타트 & 포그라운드 복귀)
    ReceiveSharingIntent.getReceivedFiles(handleSharedFiles, handleError, 'ansimi');

    // 앱이 백그라운드에서 포그라운드로 복귀할 때도 처리
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        ReceiveSharingIntent.getReceivedFiles(handleSharedFiles, handleError, 'ansimi');
      }
      appState.current = nextState;
    });

    return () => {
      subscription.remove();
      ReceiveSharingIntent.clearReceivedFiles();
    };
  }, [user?.id]);
}
