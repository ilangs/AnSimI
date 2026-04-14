import { useEffect } from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

/**
 * Android Share Intent 처리 훅
 *
 * 흐름:
 * ShareReceiverActivity(Kotlin) → ansimi://share?text=<인코딩>
 *   → Linking 이벤트 → 분석 화면으로 이동 + 텍스트 자동 입력
 *
 * 타이밍 처리:
 * - 앱이 닫혀있을 때(콜드 스타트): getInitialURL → pendingSharedText 저장
 *   → 사용자 로딩 완료 후 처리
 * - 앱이 열려있을 때(포그라운드): addEventListener → 즉시 처리
 */

// 앱 초기화 전 Share Intent가 도착하는 경우를 위한 임시 저장소
let pendingSharedText: string | null = null;

function parseShareUrl(url: string): string | null {
  try {
    if (!url.includes('ansimi://share')) return null;
    const qs = url.split('?')[1] ?? '';
    const params = new URLSearchParams(qs);
    const raw = params.get('text') ?? '';
    return decodeURIComponent(raw) || null;
  } catch {
    return null;
  }
}

export function useShareIntent() {
  const router = useRouter();
  const { user } = useAuthStore();

  const navigateToAnalyze = (text: string) => {
    if (!text.trim()) return;
    router.push({
      pathname: '/(parent)/analyze',
      params: { sharedText: encodeURIComponent(text) },
    });
  };

  // 콜드 스타트: 앱이 Share Intent로 실행된 경우
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (!url) return;
      const text = parseShareUrl(url);
      if (text) pendingSharedText = text; // 사용자 로딩 후 처리
    });
  }, []);

  // 포그라운드: 앱이 열린 상태에서 Share Intent가 들어온 경우
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      const text = parseShareUrl(url);
      if (!text) return;

      if (user?.role === 'parent') {
        navigateToAnalyze(text);
      } else {
        pendingSharedText = text;
      }
    });
    return () => sub.remove();
  }, [user?.id]);

  // 사용자 로딩 완료 후 pendingSharedText 처리 (콜드 스타트 케이스)
  useEffect(() => {
    if (user?.role === 'parent' && pendingSharedText) {
      const text = pendingSharedText;
      pendingSharedText = null;
      navigateToAnalyze(text);
    }
  }, [user?.id]);
}
