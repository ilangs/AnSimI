import { useEffect } from 'react';
import { View, LogBox } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/services/supabase';
import { registerForPushNotifications } from '@/services/notification';
import { useShareIntent } from '@/hooks/useShareIntent';
import OfflineBanner, { useNetworkStatus } from '@/components/ui/OfflineBanner';

// react-native-screens 4.x Expo Go 애니메이션 경고 무시
LogBox.ignoreLogs([
  'Attempting to run JS driven animation',
  'useNativeDriver',
  'expo-notifications',
]);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
    mutations: { retry: 1 },
  },
});

function AuthGate() {
  const { user, family, isInitialized, initialize, updateFcmToken } = useAuthStore();
  useShareIntent();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => { initialize(); }, []);

  useEffect(() => {
    if (isInitialized) SplashScreen.hideAsync().catch(() => {});
  }, [isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';
    if (!user) {
      if (!inAuthGroup) router.replace('/auth/login');
    } else {
      if (inAuthGroup) {
        // 이미 가족 연결 완료된 경우 → 역할별 메인 화면으로 바로 이동 (role/connect 재진입 방지)
        if (family) {
          router.replace(user.role === 'parent' ? '/(parent)/' : '/(child)/');
        } else {
          router.replace('/onboarding/role');
        }
      } else if (!family && !inOnboarding) {
        // 가족 미연결 상태면 온보딩 connect로 이동
        router.replace('/onboarding/connect');
      }
    }
  }, [user, family, isInitialized, segments]);

  useEffect(() => {
    if (!user) return;
    registerForPushNotifications()
      .then((token) => { if (token) updateFcmToken(token); })
      .catch(() => {});
  }, [user?.id]);

  return null;
}

function NetworkLayer() {
  const isOnline = useNetworkStatus();
  return <OfflineBanner isOnline={isOnline} />;
}

// 비밀번호 재설정 딥링크 처리 (ansimi://auth/reset-password#access_token=...)
function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (!url.includes('type=recovery')) return;
      const fragment = url.split('#')[1] ?? '';
      const params: Record<string, string> = {};
      fragment.split('&').forEach((p) => {
        const [k, v] = p.split('=');
        if (k && v) params[decodeURIComponent(k)] = decodeURIComponent(v);
      });
      if (params.access_token) {
        try {
          await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token ?? '',
          });
        } catch {}
        router.replace('/auth/reset-password');
      }
    };

    // 앱이 닫혀 있다가 딥링크로 열렸을 때
    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });
    // 앱이 열려 있는 상태에서 딥링크가 들어올 때
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <View style={{ flex: 1 }}>
          <AuthGate />
          <NetworkLayer />
          <DeepLinkHandler />
          {/* Slot: RNSScreenStack을 사용하지 않아 애니메이션 충돌 없음 */}
          <Slot />
        </View>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
