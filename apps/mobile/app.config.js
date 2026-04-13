// app.config.js — app.json 대신 사용 (EAS 환경변수 지원)
// EAS Build 시: process.env.GOOGLE_SERVICES_JSON = 시크릿 파일 경로
// 로컬 개발 시: ./google-services.json 직접 참조
module.exports = {
  expo: {
    name: '안심이',
    slug: 'ansimi',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'ansimi',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#1D9E75',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.ansimi.app',
      infoPlist: {
        NSUserNotificationUsageDescription:
          '보이스피싱 위험 알림을 받기 위해 알림 권한이 필요합니다.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#1D9E75',
      },
      package: 'com.ansimi.app',
      permissions: [
        'RECEIVE_SMS',
        'READ_SMS',
        'VIBRATE',
        'RECEIVE_BOOT_COMPLETED',
      ],
      // EAS Build: 시크릿 파일 경로 / 로컬: 직접 파일 참조
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#1D9E75',
          defaultChannel: 'ansimi-alerts',
        },
      ],
      'expo-web-browser',
      // Share Intent: 다른 앱(삼성 메시지 등)에서 텍스트 공유 시 안심이로 받기
      [
        'react-native-receive-sharing-intent',
        {
          androidIntentFilters: ['text/plain'],
          iosActivationRules: { NSExtensionActivationSupportsText: true },
          URIScheme: 'ansimi',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    updates: {
      enabled: false,
    },
    extra: {
      router: { origin: false },
      eas: { projectId: 'a63237c0-8f28-48c0-9437-d95e1d14034a' },
    },
    owner: 'ilangs',
  },
};
