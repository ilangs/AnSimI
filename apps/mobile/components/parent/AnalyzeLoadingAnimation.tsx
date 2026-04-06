import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Colors } from '@/constants/colors';

const LOADING_STEPS = [
  '안심이가 문자를 읽고 있어요...',
  'AI가 위험 요소를 분석 중이에요...',
  '판별 결과를 정리하고 있어요...',
];

export default function AnalyzeLoadingAnimation() {
  const [stepIndex, setStepIndex] = useState(0);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  // 방패 회전 애니메이션
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(spinAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // 맥박 애니메이션
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // 로딩 텍스트 단계 전환
  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // 점 애니메이션
  useEffect(() => {
    Animated.loop(
      Animated.timing(dotAnim, {
        toValue: 3,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();
  }, []);

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10deg', '10deg'],
  });

  return (
    <View style={styles.container} accessibilityLabel="분석 중입니다. 잠시 기다려주세요">
      {/* 방패 아이콘 */}
      <Animated.View
        style={[
          styles.shieldWrapper,
          { transform: [{ rotate }, { scale: pulseAnim }] },
        ]}
      >
        <View style={styles.shieldBg}>
          <Text style={styles.shieldEmoji}>🛡️</Text>
        </View>
      </Animated.View>

      {/* 분석 진행 단계 */}
      <Text style={styles.stepText}>{LOADING_STEPS[stepIndex]}</Text>

      {/* 진행 점 */}
      <View style={styles.dotsRow}>
        {[0, 1, 2].map((i) => (
          <LoadingDot key={i} index={i} />
        ))}
      </View>

      {/* 안내 문구 */}
      <Text style={styles.hint}>잠깐만 기다려주세요</Text>
    </View>
  );
}

function LoadingDot({ index }: { index: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 200;
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.delay(600 - delay),
      ])
    ).start();
  }, []);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <Animated.View
      style={[styles.dot, { transform: [{ scale }], opacity }]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 20,
  },
  shieldWrapper: {
    marginBottom: 8,
  },
  shieldBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  shieldEmoji: { fontSize: 60 },
  stepText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.brand,
    textAlign: 'center',
    lineHeight: 30,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.brand,
  },
  hint: {
    fontSize: 15,
    color: Colors.textTertiary,
  },
});
