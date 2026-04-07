import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { enableScreens } from 'react-native-screens';
import { useAuthStore } from '@/stores/authStore';

// Expo Go에서 네이티브 스크린 애니메이션 충돌 방지
enableScreens(false);
import { registerForPushNotifications } from '@/services/notification';
import OfflineBanner, { useNetworkStatus } from '@/components/ui/OfflineBanner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// 스플래시 화면 자동 숨김 방지 (hideAsync() 호출 전까지 유지)
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5분
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
    mutations: {
      retry: 1,
    },
  },
});

// 인증 게이트: 로그인 상태에 따라 화면 라우팅
function AuthGate() {
  const { user, isInitialized, initialize, updateFcmToken } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // 앱 시작 시 세션 복원
  useEffect(() => {
    initialize();
  }, []);

  // 인증 초기화 완료 시 스플래시 숨김
  useEffect(() => {
    if (isInitialized) {
      SplashScreen.hideAsync();
    }
  }, [isInitialized]);

  // 인증 상태 변화에 따른 라우팅
  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';

    if (!user) {
      // 미로그인 → 로그인 화면
      if (!inAuthGroup) router.replace('/auth/login');
    } else {
      // 로그인 완료 → 인증 화면에서 나가기
      if (inAuthGroup) {
        router.replace('/onboarding/role');
      }
    }
  }, [user, isInitialized, segments]);

  // FCM 토큰 등록
  useEffect(() => {
    if (!user) return;
    registerForPushNotifications()
      .then((token) => {
        if (token) updateFcmToken(token);
      })
      .catch((err) => console.error('FCM 등록 실패:', err));
  }, [user?.id]);

  return null;
}

// 네트워크 상태 + 배너
function NetworkLayer() {
  const isOnline = useNetworkStatus();
  return <OfflineBanner isOnline={isOnline} />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <View style={{ flex: 1 }}>
            <AuthGate />
            <NetworkLayer />
            <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
              <Stack.Screen name="(parent)" />
              <Stack.Screen name="(child)" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="auth" />
            </Stack>
          </View>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
