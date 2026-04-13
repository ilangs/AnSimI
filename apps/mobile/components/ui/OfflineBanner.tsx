import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors } from '@/constants/colors';

/**
 * 네트워크 상태 감지 배너
 * @react-native-community/netinfo 설치 없이 fetch 실패로 오프라인 감지
 * 실제 연동 시: npm install @react-native-community/netinfo
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    const checkConnection = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        // Supabase URL로 연결 확인 (Vercel 배포 상태와 무관)
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/`,
          {
            method: 'HEAD',
            headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '' },
            signal: controller.signal,
          }
        );
        setIsOnline(res.status < 500);
      } catch {
        setIsOnline(false);
      } finally {
        clearTimeout(timeout);
      }
    };

    checkConnection();
    timer = setInterval(checkConnection, 30_000); // 30초마다 확인
    return () => clearInterval(timer);
  }, []);

  return isOnline;
}

interface OfflineBannerProps {
  isOnline?: boolean;
}

export default function OfflineBanner({ isOnline = true }: OfflineBannerProps) {
  const [prevOnline, setPrevOnline] = useState(isOnline);
  const [showRestored, setShowRestored] = useState(false);
  const slideAnim = useRef(new Animated.Value(-64)).current;

  useEffect(() => {
    if (!isOnline) {
      // 오프라인 → 배너 등장
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start();
    } else if (!prevOnline && isOnline) {
      // 복구 → 잠깐 보이다 숨김
      setShowRestored(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start();
      setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -64,
          duration: 400,
          useNativeDriver: true,
        }).start(() => setShowRestored(false));
      }, 2500);
    }
    setPrevOnline(isOnline);
  }, [isOnline]);

  if (isOnline && !showRestored) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { transform: [{ translateY: slideAnim }] },
        showRestored && isOnline ? styles.bannerOnline : styles.bannerOffline,
      ]}
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.icon}>{isOnline ? '✅' : '📵'}</Text>
      <Text style={styles.text}>
        {isOnline
          ? '인터넷이 다시 연결되었어요!'
          : '인터넷 연결이 없어요. 저장된 데이터를 보여드려요.'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bannerOffline: { backgroundColor: Colors.textPrimary },
  bannerOnline: { backgroundColor: Colors.safe },
  icon: { fontSize: 18 },
  text: {
    flex: 1,
    fontSize: 14,
    color: Colors.white,
    lineHeight: 20,
    fontWeight: '500',
  },
});
