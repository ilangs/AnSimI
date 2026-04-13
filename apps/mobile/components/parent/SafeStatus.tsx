import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useAlertStore } from '@/stores/alertStore';
import { Colors } from '@/constants/colors';

export default function SafeStatus() {
  const alerts = useAlertStore((s) => s.alerts);
  // scale만 애니메이션 (useNativeDriver: true — 충돌 없음)
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const today = new Date().toDateString();
  const hasActiveDanger = alerts.some((a) => {
    const isToday = new Date(a.created_at).toDateString() === today;
    return !a.is_read && isToday && (a.type === 'danger' || a.type === 'sos');
  });

  const statusColor = hasActiveDanger ? Colors.danger : Colors.safe;
  const statusText  = hasActiveDanger ? '위험을 감지했어요!' : '오늘도 안전해요';
  const statusIcon  = hasActiveDanger ? '🚨' : '✅';
  const statusDesc  = hasActiveDanger ? '자녀에게 알림을 보냈어요' : '안심이가 잘 지키고 있어요';

  useEffect(() => {
    if (hasActiveDanger) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [hasActiveDanger]);

  return (
    <View
      style={styles.container}
      accessibilityLabel={`현재 상태: ${statusText}. ${statusDesc}`}
      accessibilityRole="text"
    >
      <Animated.View
        style={[
          styles.circle,
          {
            borderColor: statusColor,
            shadowColor: statusColor,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <View style={[styles.innerCircle, { backgroundColor: statusColor + '18' }]}>
          <Text style={styles.icon}>{statusIcon}</Text>
        </View>
      </Animated.View>

      <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
      <Text style={styles.descText}>{statusDesc}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 8 },
  circle: {
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 10,
    marginBottom: 24,
    backgroundColor: Colors.white,
  },
  innerCircle: {
    width: 168,
    height: 168,
    borderRadius: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon:       { fontSize: 76 },
  statusText: { fontSize: 28, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  descText:   { fontSize: 18, color: Colors.textSecondary, textAlign: 'center' },
});
