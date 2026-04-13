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
import { supabase } from '@/services/supabase';
import { Colors } from '@/constants/colors';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleReset = async () => {
    if (password.length < 6) {
      Alert.alert('알림', '비밀번호는 6자 이상이어야 해요');
      return;
    }
    if (password !== confirm) {
      Alert.alert('알림', '비밀번호가 일치하지 않아요');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert('완료', '비밀번호가 변경되었어요!', [
        { text: '로그인', onPress: () => router.replace('/auth/login') },
      ]);
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
        <Text style={styles.emoji}>🔑</Text>
        <Text style={styles.title}>새 비밀번호 설정</Text>
        <Text style={styles.desc}>새로 사용할 비밀번호를 입력해주세요.</Text>

        <TextInput
          style={styles.input}
          placeholder="새 비밀번호 (6자 이상)"
          placeholderTextColor={Colors.textTertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoFocus
          accessibilityLabel="새 비밀번호 입력"
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호 확인"
          placeholderTextColor={Colors.textTertiary}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          accessibilityLabel="비밀번호 확인 입력"
        />

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleReset}
          disabled={isLoading}
        >
          {isLoading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.buttonText}>비밀번호 변경하기</Text>
          }
        </TouchableOpacity>
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
});
