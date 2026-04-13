import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';

export default function ConnectScreen() {
  const router = useRouter();
  const { user, setFamily } = useAuthStore();
  const { createFamily, joinFamily, family: existingFamily } = useFamilyStore();

  const [code, setCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [createdFamily, setCreatedFamily] = useState<{ id: string; code: string; name: string } | null>(null);
  const inputRef = useRef<TextInput>(null);

  const isParent = user?.role === 'parent';
  const displayCode = createdFamily?.code ?? existingFamily?.code;

  // 자녀: 새 가족 그룹 생성
  const handleCreateFamily = async () => {
    if (!user) return;
    setIsCreating(true);
    try {
      const family = await createFamily(user.id, `${user.name ?? '우리'} 가족`);
      setCreatedFamily(family);
      setFamily(family);
    } catch (err: any) {
      Alert.alert('오류', err.message ?? '가족 그룹 생성에 실패했습니다');
    } finally {
      setIsCreating(false);
    }
  };

  // 코드 공유
  const handleShareCode = async () => {
    if (!displayCode) return;
    await Share.share({
      message: `안심이 가족 연결 코드: ${displayCode}\n\n부모님 앱 → 위험 문자 탭 → 가족 연결 → 코드 입력`,
      title: '안심이 가족 연결 코드',
    });
  };

  // 코드로 가족 합류 (부모님 or 자녀 추가 합류)
  const handleJoinFamily = async () => {
    if (!user || code.trim().length !== 6) {
      Alert.alert('알림', '6자리 코드를 입력해주세요');
      return;
    }
    setIsJoining(true);
    try {
      const family = await joinFamily(code.trim(), user.id);
      setFamily(family);
      navigateToMain();
    } catch (err: any) {
      Alert.alert('연결 실패', err.message ?? '코드를 다시 확인해주세요');
    } finally {
      setIsJoining(false);
    }
  };

  const navigateToMain = () => {
    if (isParent) {
      // 방침 v2.0 제2부 2.1 ③~④단계:
      // 부모님은 가족 연결 후 반드시 전용 큰 글씨 동의 화면을 거쳐야 AI 분석 활성화
      // is_family_consent_complete() = TRUE가 되어야 메인 화면에서 분석 기능 사용 가능
      router.replace('/onboarding/parent-consent');
    } else {
      router.replace('/(child)/');
    }
  };

  // ── 부모님: 코드 입력 화면 ──
  if (isParent) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={styles.emoji}>🔑</Text>
          <Text style={styles.title}>자녀가 알려준{'\n'}코드를 입력해요</Text>
          <Text style={styles.subtitle}>
            자녀 앱 → 설정 → 연결 코드에서 확인하세요
          </Text>

          {/* 6자리 코드 입력 */}
          <CodeInput
            value={code}
            onChange={(t) => setCode(t.toUpperCase())}
            inputRef={inputRef}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, (isJoining || code.length < 6) && styles.btnDisabled]}
            onPress={handleJoinFamily}
            disabled={isJoining || code.length < 6}
            accessibilityLabel="가족 연결하기"
            accessibilityRole="button"
          >
            {isJoining ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.primaryBtnText}>연결하기</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── 자녀: 코드 생성 or 합류 ──
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* 코드 생성 완료 상태 */}
        {createdFamily ? (
          <>
            <Text style={styles.emoji}>🎉</Text>
            <Text style={styles.title}>가족 그룹을{'\n'}만들었어요!</Text>
            <Text style={styles.subtitle}>
              이 코드를 부모님께 알려드리세요
            </Text>

            {/* 코드 표시 */}
            <View style={styles.codeDisplay}>
              <Text style={styles.codeDisplayLabel}>연결 코드</Text>
              <Text
                style={styles.codeDisplayValue}
                accessibilityLabel={`연결 코드: ${createdFamily.code.split('').join(' ')}`}
              >
                {createdFamily.code}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.shareBtn}
              onPress={handleShareCode}
              accessibilityLabel="연결 코드 공유하기"
            >
              <Text style={styles.shareBtnText}>📤 코드 공유하기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={navigateToMain}
              accessibilityLabel="대시보드로 이동"
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>시작하기 →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.emoji}>👨‍👩‍👧‍👦</Text>
            <Text style={styles.title}>가족 연결하기</Text>
            <Text style={styles.subtitle}>
              새 가족 그룹을 만들거나{'\n'}
              기존 코드로 합류할 수 있어요
            </Text>

            {/* 새 가족 그룹 만들기 */}
            <TouchableOpacity
              style={[styles.primaryBtn, isCreating && styles.btnDisabled]}
              onPress={handleCreateFamily}
              disabled={isCreating}
              accessibilityLabel="새 가족 그룹 만들기"
              accessibilityRole="button"
            >
              {isCreating ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.primaryBtnText}>새 가족 그룹 만들기</Text>
              )}
            </TouchableOpacity>

            {/* 구분선 */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>또는</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* 코드 입력으로 합류 */}
            <Text style={styles.joinLabel}>기존 코드로 합류하기</Text>
            <CodeInput
              value={code}
              onChange={(t) => setCode(t.toUpperCase())}
              inputRef={inputRef}
            />

            <TouchableOpacity
              style={[styles.secondaryBtn, (isJoining || code.length < 6) && styles.btnDisabled]}
              onPress={handleJoinFamily}
              disabled={isJoining || code.length < 6}
              accessibilityLabel="코드로 가족 합류"
              accessibilityRole="button"
            >
              {isJoining ? (
                <ActivityIndicator color={Colors.brand} />
              ) : (
                <Text style={styles.secondaryBtnText}>코드로 합류하기</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// 6자리 코드 입력 컴포넌트

function CodeInput({
  value,
  onChange,
  inputRef,
}: {
  value: string;
  onChange: (t: string) => void;
  inputRef: React.RefObject<TextInput>;
}) {
  return (
    <TouchableOpacity
      style={codeStyles.wrapper}
      onPress={() => inputRef.current?.focus()}
      activeOpacity={1}
      accessibilityLabel="코드 입력 칸"
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={[codeStyles.cell, value[i] ? codeStyles.cellFilled : null]}
        >
          <Text style={codeStyles.cellText}>{value[i] ?? ''}</Text>
        </View>
      ))}
      <TextInput
        ref={inputRef}
        style={codeStyles.hiddenInput}
        value={value}
        onChangeText={(t) => onChange(t.slice(0, 6))}
        maxLength={6}
        autoCapitalize="characters"
        keyboardType="default"
        caretHidden
        accessibilityLabel="6자리 연결 코드 입력"
      />
    </TouchableOpacity>
  );
}

const codeStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 24,
    position: 'relative',
  },
  cell: {
    flex: 1,
    height: 60,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  cellFilled: {
    borderColor: Colors.brand,
    backgroundColor: Colors.brandLight,
  },
  cellText: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.brand,
    letterSpacing: 0,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  emoji: { fontSize: 72, textAlign: 'center' },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 42,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },

  // 코드 표시
  codeDisplay: {
    backgroundColor: Colors.brandLight,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: Colors.brand,
  },
  codeDisplayLabel: { fontSize: 14, fontWeight: '700', color: Colors.brand },
  codeDisplayValue: {
    fontSize: 44,
    fontWeight: '900',
    color: Colors.brand,
    letterSpacing: 12,
  },

  // 버튼
  primaryBtn: {
    backgroundColor: Colors.brand,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: { color: Colors.white, fontSize: 18, fontWeight: '800' },
  secondaryBtn: {
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: Colors.brand, fontSize: 17, fontWeight: '700' },
  btnDisabled: { opacity: 0.45 },

  shareBtn: {
    backgroundColor: Colors.brandLight,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.brand + '40',
  },
  shareBtnText: { color: Colors.brand, fontSize: 16, fontWeight: '700' },

  // 구분선
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 14, color: Colors.textTertiary },

  joinLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
