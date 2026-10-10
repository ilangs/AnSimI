import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { confirmPayment } from '@/services/payment';
import { useAuthStore } from '@/stores/authStore';

export default function PaymentCallbackScreen() {
  const { authKey, customerKey, userId } = useLocalSearchParams<{
    authKey?: string;
    customerKey?: string;
    userId?: string;
  }>();
  const router = useRouter();
  const { user, initialize } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'ok' | 'fail'>('loading');

  useEffect(() => {
    (async () => {
      const uid = userId ?? user?.id;
      if (!authKey || !customerKey || !uid) {
        setStatus('fail');
        Alert.alert('결제', '인증 정보가 없습니다.');
        return;
      }

      const result = await confirmPayment(String(authKey), String(customerKey), String(uid));
      if (result.success) {
        setStatus('ok');
        await initialize();
        router.replace('/(child)/settings');
      } else {
        setStatus('fail');
        Alert.alert('결제 실패', result.error ?? '다시 시도해주세요.');
      }
    })();
  }, [authKey, customerKey, userId, user?.id]);

  return (
    <View style={styles.box}>
      {status === 'loading' && (
        <>
          <ActivityIndicator size="large" color={Colors.brand} />
          <Text style={styles.text}>구독 결제를 확인하는 중…</Text>
        </>
      )}
      {status === 'ok' && <Text style={styles.text}>구독이 활성화되었습니다.</Text>}
      {status === 'fail' && <Text style={styles.text}>결제를 완료하지 못했습니다.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  text: { fontSize: 18, color: Colors.textPrimary, textAlign: 'center' },
});
