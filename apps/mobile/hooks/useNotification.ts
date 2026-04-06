import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { registerForPushNotifications } from '@/services/notification';

export function useNotification() {
  const { user, updateFcmToken } = useAuthStore();
  const router = useRouter();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (!user) return;

    // FCM 토큰 등록
    registerForPushNotifications().then((token) => {
      if (token) updateFcmToken(token);
    });

    // 포그라운드 알림 수신 리스너
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('알림 수신:', notification);
    });

    // 알림 탭 응답 리스너
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const role = user.role;

      if (data?.type === 'danger' || data?.type === 'warning') {
        if (role === 'child') {
          router.push('/(child)/');
        } else {
          router.push('/(parent)/alert');
        }
      } else if (data?.type === 'sos') {
        if (role === 'child') {
          router.push('/(child)/');
        }
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user?.id]);
}
