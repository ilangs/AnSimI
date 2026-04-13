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
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/services/supabase';
import { Colors } from '@/constants/colors';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const handleSend = async () => {
    if (!email.trim()) {
      Alert.alert('알림', '이메일을 입력해주세요');
      return;
    }
    setIsLoading(true);
    try {
      // Expo Go 개발: exp://IP:8081/--/auth/reset-password
      // 프로덕션 빌드: ansimi://auth/reset-password
      const redirectTo = Linking.createURL('auth/reset-password');
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      Alert.alert('오류', err.message ?? '잠시 후 다시 시도해주세요');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
    >
      <View style={styles.inner}>
        <Text style={styles.emoji}>🔐</Text>
        <Text style={styles.title}>비밀번호 찾기</Text>

        {sent ? (
          <>
            <View style={styles.successBox}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successText}>
                이메일을 보냈어요!{'\n\n'}
                📱 <Text style={{ fontWeight: '800' }}>폰에서</Text> 이메일을 열고{'\n'}
                링크를 클릭해주세요.{'\n\n'}
                <Text style={{ fontSize: 12, color: '#999' }}>
                  PC에서 클릭하면 열리지 않아요
                </Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.replace('/auth/login')}
            >
              <Text style={styles.buttonText}>로그인 화면으로</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.desc}>
              가입한 이메일 주소를 입력하면{'\n'}
              비밀번호 재설정 링크를 보내드려요.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="이메일"
              placeholderTextColor={Colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoFocus
              accessibilityLabel="이메일 입력"
            />
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSend}
              disabled={isLoading}
            >
              {isLoading
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.buttonText}>재설정 이메일 보내기</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backLink}
              onPress={() => router.back()}
            >
              <Text style={styles.backText}>← 로그인으로 돌아가기</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emoji: { fontSize: 56, textAlign: 'center' },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  desc: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
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
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  backLink: { alignItems: 'center', paddingVertical: 8 },
  backText: { fontSize: 15, color: Colors.textSecondary },
  successBox: {
    backgroundColor: Colors.brandLight,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  successIcon: { fontSize: 40 },
  successText: {
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '500',
  },
});
