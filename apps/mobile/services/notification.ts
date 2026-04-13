import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { NotifyRequest } from '@/types';

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

// 알림 기본 설정 (Expo SDK 54: shouldShowAlert → shouldShowBanner + shouldShowList)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,   // iOS 14+ 배너
    shouldShowList: true,     // 알림 센터 표시
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.error('푸시 알림은 실기기에서만 작동합니다');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.error('알림 권한이 거부되었습니다');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('ansimi-alerts', {
      name: '안심이 알림',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E24B4A',
      sound: 'default',
    });
  }

  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
  if (!projectId) {
    console.warn('EXPO_PUBLIC_PROJECT_ID가 설정되지 않아 FCM 토큰을 가져올 수 없습니다');
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

export async function sendNotification(req: NotifyRequest): Promise<void> {
  await fetch(`${API_URL}/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
}
