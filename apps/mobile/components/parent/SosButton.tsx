import { useState, useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Vibration,
  Animated,
  Easing,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { sendNotification } from '@/services/notification';

interface SosButtonProps {
  familyId: string;
  senderId?: string;
  large?: boolean;
}

export default function SosButton({
  familyId,
  senderId,
  large = false,
}: SosButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  // 대기 상태 맥박 애니메이션
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    pulse.start();
    glow.start();
    return () => {
      pulse.stop();
      glow.stop();
    };
  }, []);

  const handleSos = async () => {
    Alert.alert(
      '🆘 SOS 알림 보내기',
      '자녀 모두에게 즉시 알림이 발송됩니다.\n정말 보내시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '지금 보내기',
          style: 'destructive',
          onPress: async () => {
            if (!familyId) {
              Alert.alert(
                '연결 필요',
                '자녀와 가족 연결 후 SOS를 사용할 수 있어요'
              );
              return;
            }
            setIsLoading(true);

            // 강한 진동 패턴 (SOS: ···---···)
            Vibration.vibrate([
              0, 200, 100, 200, 100, 200,   // S (···)
              300, 500, 100, 500, 100, 500, // O (---)
              300, 200, 100, 200, 100, 200, // S (···)
            ]);

            try {
              await sendNotification({
                familyId,
                alertType: 'sos',
                sosUserId: senderId,
              });
              Alert.alert(
                '✅ SOS 발송 완료',
                '자녀에게 긴급 알림을 보냈어요.\n잠시 후 연락이 올 거예요.'
              );
            } catch {
              Alert.alert(
                '⚠️ 발송 실패',
                '알림 발송에 실패했어요.\n자녀에게 직접 전화해주세요.'
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0.5, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ scale: pulseAnim }],
          shadowOpacity,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.button,
          large && styles.buttonLarge,
          isLoading && styles.buttonLoading,
        ]}
        onPress={handleSos}
        disabled={isLoading}
        activeOpacity={0.75}
        accessibilityLabel="SOS 긴급 알림 보내기. 자녀 모두에게 즉시 긴급 알림이 발송됩니다"
        accessibilityRole="button"
        accessibilityHint="두 번 탭하면 자녀에게 긴급 알림이 발송됩니다"
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.white} size="large" />
        ) : (
          <>
            <Text style={[styles.icon, large && styles.iconLarge]}>🆘</Text>
            <Text style={[styles.text, large && styles.textLarge]}>
              SOS 긴급 알림
            </Text>
            <Text style={[styles.subText, large && styles.subTextLarge]}>
              자녀에게 즉시 알림
            </Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 10,
    borderRadius: 22,
  },
  button: {
    backgroundColor: Colors.danger,
    borderRadius: 22,
    paddingVertical: 22,
    alignItems: 'center',
    gap: 4,
    minHeight: 80,     // 터치 영역 최소 56dp 초과
  },
  buttonLarge: {
    paddingVertical: 32,
    borderRadius: 26,
    minHeight: 130,
  },
  buttonLoading: { opacity: 0.75 },
  icon: { fontSize: 34 },
  iconLarge: { fontSize: 52 },
  text: {
    fontSize: 24,     // 어르신 친화 크기
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  textLarge: { fontSize: 30 },
  subText: { fontSize: 16, color: Colors.white + 'CC' },
  subTextLarge: { fontSize: 20 },
});
