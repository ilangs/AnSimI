import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants/colors';
import { UserRole } from '@/types';

// 개인정보처리방침 공개 URL (앱 출시 후 실제 URL로 교체)
const PRIVACY_POLICY_URL = 'https://an-sim-i.vercel.app/privacy';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('child');

  // 개인정보처리방침 동의 상태 (개인정보보호법 제15조·제22조 — 구체적·명확한 동의)
  const [consentPrivacy, setConsentPrivacy] = useState(false);      // 필수: 수집·이용 동의
  const [consentOverseas, setConsentOverseas] = useState(false);    // 필수: 국외 이전 동의 (Anthropic AI)

  // 이용약관 면책 조항 동의 (방침 v2.0 제3부 3.2항 — 법원 '중요조항 미고지' 방지)
  const [consentTerms, setConsentTerms] = useState(false);          // 필수: 이용약관 전문 동의
  const [consentAiLimit, setConsentAiLimit] = useState(false);      // 필수: AI 참고용·정확성 미보증
  const [consentSelfDecision, setConsentSelfDecision] = useState(false); // 필수: 최종판단 본인 직접

  const allConsented =
    consentPrivacy && consentOverseas &&
    consentTerms && consentAiLimit && consentSelfDecision;

  const { signUp, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSignup = async () => {
    if (!email.trim() || !password.trim() || !name.trim()) {
      Alert.alert('알림', '모든 항목을 입력해주세요');
      return;
    }
    if (password.length < 6) {
      Alert.alert('알림', '비밀번호는 6자 이상이어야 합니다');
      return;
    }
    // 5개 필수 동의 전체 체크 필요 (개인정보보호법 제22조 + 이용약관 면책 조항)
    if (!allConsented) {
      Alert.alert('동의 필요', '모든 필수 동의 항목을 확인해주세요');
      return;
    }

    try {
      await signUp(email.trim(), password, role, name.trim());
      router.replace('/onboarding/role');
    } catch (err: any) {
      Alert.alert('회원가입 실패', err.message ?? '잠시 후 다시 시도해주세요');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>

        <Text style={styles.title}>회원가입</Text>
        <Text style={styles.subtitle}>안심이와 함께 가족을 지켜요</Text>

        {/* 역할 선택 */}
        <Text style={styles.label}>나는 누구인가요?</Text>
        <View style={styles.roleRow}>
          {(['child', 'parent'] as UserRole[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              onPress={() => setRole(r)}
              accessibilityRole="radio"
              accessibilityState={{ selected: role === r }}
            >
              <Text style={styles.roleIcon}>{r === 'child' ? '👨‍💻' : '👴'}</Text>
              <Text style={[styles.roleLabel, role === r && styles.roleLabelActive]}>
                {r === 'child' ? '자녀' : '부모님'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="이름"
            placeholderTextColor={Colors.textTertiary}
            value={name}
            onChangeText={setName}
            accessibilityLabel="이름 입력"
          />
          <TextInput
            style={styles.input}
            placeholder="이메일"
            placeholderTextColor={Colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            accessibilityLabel="이메일 입력"
          />
          <TextInput
            style={styles.input}
            placeholder="비밀번호 (6자 이상)"
            placeholderTextColor={Colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            accessibilityLabel="비밀번호 입력"
          />

          {/* ── 개인정보 동의 (개인정보보호법 제15조·제22조 필수) ── */}
          <View style={styles.consentBox}>
            <Text style={styles.consentTitle}>개인정보 수집·이용 동의</Text>

            {/* 필수 동의 1: 수집·이용 */}
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setConsentPrivacy((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consentPrivacy }}
              accessibilityLabel="개인정보 수집·이용 동의 (필수)"
            >
              <Text style={[styles.checkbox, consentPrivacy && styles.checkboxChecked]}>
                {consentPrivacy ? '☑' : '☐'}
              </Text>
              <View style={styles.consentTextWrap}>
                <Text style={styles.consentLabel}>
                  <Text style={styles.consentRequired}>[필수] </Text>
                  개인정보 수집·이용 동의
                </Text>
                <Text style={styles.consentDesc}>
                  이메일, 이름, 역할, FCM 토큰 수집. AI 분석 후 원문 즉시 파기.
                </Text>
              </View>
            </TouchableOpacity>

            {/* 필수 동의 2: 국외 이전 (Anthropic AI 분석) */}
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setConsentOverseas((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consentOverseas }}
              accessibilityLabel="개인정보 국외 이전 동의 (필수)"
            >
              <Text style={[styles.checkbox, consentOverseas && styles.checkboxChecked]}>
                {consentOverseas ? '☑' : '☐'}
              </Text>
              <View style={styles.consentTextWrap}>
                <Text style={styles.consentLabel}>
                  <Text style={styles.consentRequired}>[필수] </Text>
                  국외 이전 동의 (AI 분석)
                </Text>
                <Text style={styles.consentDesc}>
                  문자 분석 시 미국 Anthropic, Inc. 서버로 전송. 분석 완료 즉시 파기(ZDR 적용).
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
              accessibilityLabel="개인정보처리방침 전문 보기"
              accessibilityRole="link"
            >
              <Text style={styles.privacyLink}>개인정보처리방침 전문 보기 →</Text>
            </TouchableOpacity>
          </View>

          {/* ── 이용약관 면책 조항 (방침 v2.0 제3부 3.2항 — 법원 '중요조항 미고지' 방지) ── */}
          <View style={styles.consentBox}>
            <Text style={styles.consentTitle}>이용약관 및 면책 동의</Text>
            <Text style={styles.consentDesc}>
              ⚠️ 아래 항목은 일반 약관에 묻어두면 법원이 '중요조항 미고지'로 무효 판단할 수 있어 별도 고지합니다.
            </Text>

            {/* 면책 1: 이용약관 전문 동의 */}
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setConsentTerms((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consentTerms }}
              accessibilityLabel="이용약관 전문 동의 (필수)"
            >
              <Text style={[styles.checkbox, consentTerms && styles.checkboxChecked]}>
                {consentTerms ? '☑' : '☐'}
              </Text>
              <View style={styles.consentTextWrap}>
                <Text style={styles.consentLabel}>
                  <Text style={styles.consentRequired}>[필수] </Text>
                  이용약관 전문에 동의합니다.
                </Text>
              </View>
            </TouchableOpacity>

            {/* 면책 2: AI 참고용 선언 + 정확성 무보증 */}
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setConsentAiLimit((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consentAiLimit }}
              accessibilityLabel="AI 분석 참고용 및 정확성 미보증 동의 (필수)"
            >
              <Text style={[styles.checkbox, consentAiLimit && styles.checkboxChecked]}>
                {consentAiLimit ? '☑' : '☐'}
              </Text>
              <View style={styles.consentTextWrap}>
                <Text style={styles.consentLabel}>
                  <Text style={styles.consentRequired}>[필수] </Text>
                  AI 분석 결과는 '참고용'이며, 회사는 결과의 정확성을 보증하지 않음에 동의합니다.
                </Text>
                <Text style={styles.consentDesc}>
                  정상 문자 위험 판별(오탐), 위험 문자 정상 판별(미탐)이 발생할 수 있습니다.
                </Text>
              </View>
            </TouchableOpacity>

            {/* 면책 3: 최종 판단 본인 책임 */}
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setConsentSelfDecision((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consentSelfDecision }}
              accessibilityLabel="최종 판단 본인 직접 동의 (필수)"
            >
              <Text style={[styles.checkbox, consentSelfDecision && styles.checkboxChecked]}>
                {consentSelfDecision ? '☑' : '☐'}
              </Text>
              <View style={styles.consentTextWrap}>
                <Text style={styles.consentLabel}>
                  <Text style={styles.consentRequired}>[필수] </Text>
                  최종 판단은 제가 직접 한다는 사실에 동의합니다.
                </Text>
                <Text style={styles.consentDesc}>
                  의심 시 금융감독원(1332) 또는 경찰(112)에 직접 신고하세요.
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (isLoading || !allConsented) && styles.buttonDisabled,
            ]}
            onPress={handleSignup}
            disabled={isLoading || !allConsented}
            accessibilityLabel="회원가입"
            accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>가입하기</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  inner: { padding: 32, paddingTop: 60 },
  backBtn: { marginBottom: 24 },
  backText: { fontSize: 16, color: Colors.brand, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 16, color: Colors.textSecondary, marginBottom: 32 },
  label: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, marginBottom: 12 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  roleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    gap: 8,
  },
  roleBtnActive: {
    borderColor: Colors.brand,
    backgroundColor: Colors.brandLight,
  },
  roleIcon: { fontSize: 32 },
  roleLabel: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  roleLabelActive: { color: Colors.brand },
  form: { gap: 16 },
  input: {
    height: 56,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  button: {
    height: 56,
    backgroundColor: Colors.brand,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.white, fontSize: 18, fontWeight: '600' },

  // 개인정보 동의 영역
  consentBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    backgroundColor: Colors.background,
    marginTop: 4,
  },
  consentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkbox: {
    fontSize: 22,
    color: Colors.border,
    lineHeight: 28,
  },
  checkboxChecked: {
    color: Colors.brand,
  },
  consentTextWrap: { flex: 1 },
  consentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  consentRequired: {
    color: Colors.danger,
    fontWeight: '700',
  },
  consentDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  privacyLink: {
    fontSize: 13,
    color: Colors.brand,
    textDecorationLine: 'underline',
    marginTop: 4,
    textAlign: 'right',
  },
});
