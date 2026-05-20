import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useAlertStore } from '@/stores/alertStore';
import { useLinkApproval } from '@/hooks/useLinkApproval';
import { useBlockedMessages } from '@/hooks/useBlockedMessages';

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 22, opacity: color === Colors.brand ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function ChildLayout() {
  const router = useRouter();
  const unreadCount = useAlertStore((s) => s.unreadCount);
  const { pendingCount } = useLinkApproval();
  const { pendingCount: blockedPending } = useBlockedMessages();
  const insets = useSafeAreaInsets();

  // 자녀 폰: 위험/주의 알림 탭 → 링크 알림 화면(차단 문자 검토 섹션)으로 이동
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data ?? {};
      const type = data.type as string | undefined;
      if (type === 'danger' || type === 'warning') {
        router.push('/(child)/link-alerts');
      }
    });
    return () => sub.remove();
  }, []);

  // 링크 알림 탭 뱃지 = 링크 대기 + 차단 문자 대기 합산
  const totalPending = pendingCount + blockedPending;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.brand,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 6,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          backgroundColor: Colors.white,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 2,
          includeFontPadding: false,
        },
        tabBarIconStyle: { marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '대시보드',
          tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tabs.Screen
        name="analyze"
        options={{
          title: '문자 분석',
          tabBarIcon: ({ color }) => <TabIcon emoji="🔍" color={color} />,
        }}
      />
      <Tabs.Screen
        name="link-alerts"
        options={{
          title: '보호 센터',
          tabBarIcon: ({ color }) => <TabIcon emoji="🛡️" color={color} />,
          tabBarBadge: totalPending > 0 ? totalPending : undefined,
          tabBarAccessibilityLabel: `부모님 폰 보호 센터. 확인 대기 ${totalPending}건`,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: '주간 리포트',
          tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: ({ color }) => <TabIcon emoji="⚙️" color={color} />,
        }}
      />
    </Tabs>
  );
}
