import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Text } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Colors } from '@/constants/colors';
import { useParentRealtime } from '@/hooks/useParentRealtime';
import { useAlertStore } from '@/stores/alertStore';

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return (
    <Text
      style={{ fontSize: 26, opacity: color === Colors.brand ? 1 : 0.45 }}
      accessibilityElementsHidden
    >
      {emoji}
    </Text>
  );
}

export default function ParentLayout() {
  const router = useRouter();
  const unreadCount = useAlertStore((s) => s.unreadCount);

  // Supabase Realtime 구독 (새 위험 문자 자동 감지)
  useParentRealtime();

  // FCM 알림 탭 → 화면 이동
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const { type } = response.notification.request.content.data ?? {};
      if (type === 'danger' || type === 'warning') {
        router.push('/(parent)/alert');
      } else if (type === 'sos') {
        router.push('/(parent)/sos');
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.brand,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
          height: 78,
          paddingBottom: 14,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          backgroundColor: Colors.white,
        },
        tabBarLabelStyle: {
          fontSize: 14,     // 어르신 친화 크기
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
          tabBarAccessibilityLabel: '홈 화면으로 이동',
        }}
      />
      <Tabs.Screen
        name="alert"
        options={{
          title: '위험 문자',
          tabBarIcon: ({ color }) => <TabIcon emoji="🚨" color={color} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarAccessibilityLabel: `위험 문자 확인. ${unreadCount > 0 ? `새 알림 ${unreadCount}개` : ''}`,
        }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: 'SOS',
          tabBarIcon: ({ color }) => <TabIcon emoji="🆘" color={color} />,
          tabBarAccessibilityLabel: 'SOS 긴급 알림 보내기',
        }}
      />
      {/* 분석 화면은 alert 탭에서 push로 이동 (탭바 미표시) */}
      <Tabs.Screen name="analyze" options={{ href: null }} />
    </Tabs>
  );
}
