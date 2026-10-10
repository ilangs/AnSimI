import { useEffect, useState } from 'react';
import { View, LogBox } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/services/supabase';
import { hasUserConsent } from '@/services/familyGate';
import { registerForPushNotifications } from '@/services/notification';
import { useShareIntent } from '@/hooks/useShareIntent';
import { useAutoAnalyze } from '@/hooks/useAutoAnalyze';
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
  useAutoAnalyze();
  const segments = useSegments();
  const router = useRouter();
  const [parentConsentOk, setParentConsentOk] = useState<boolean | null>(null);

  useEffect(() => { initialize(); }, []);

  useEffect(() => {
    if (isInitialized) SplashScreen.hideAsync().catch(() => {});
  }, [isInitialized]);

  useEffect(() => {
    if (!user?.id || user.role !== 'parent') {
      setParentConsentOk(null);
      return;
    }
    hasUserConsent(user.id).then(setParentConsentOk);
  }, [user?.id, user?.role, family?.id, segments.join('/')]);

  useEffect(() => {
    if (!isInitialized) return;
    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';
    const onParentConsent =
      inOnboarding && (segments as string[])[1] === 'parent-consent';

    if (!user) {
      if (!inAuthGroup) router.replace('/auth/login');
    } else {
      if (inAuthGroup) {
        if (family) {
          if (user.role === 'parent' && parentConsentOk === false) {
            router.replace('/onboarding/parent-consent');
          } else {
            router.replace(user.role === 'parent' ? '/(parent)/' : '/(child)/');
          }
        } else {
          router.replace('/onboarding/role');
        }
      } else if (!family && !inOnboarding) {
        router.replace('/onboarding/connect');
      } else if (
        user.role === 'parent' &&
        family &&
        parentConsentOk === false &&
        !onParentConsent
      ) {
        router.replace('/onboarding/parent-consent');
      }
    }
  }, [user, family, isInitialized, segments, parentConsentOk]);

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
