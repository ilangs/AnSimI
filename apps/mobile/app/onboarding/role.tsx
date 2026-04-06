import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';

export default function RoleScreen() {
  const { user } = useAuthStore();
  const router = useRouter();

  const handleContinue = () => {
    router.push('/onboarding/connect');
  };

  const role = user?.role ?? 'child';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>{role === 'parent' ? '👴' : '👨‍💻'}</Text>
        <Text style={styles.title}>
          {role === 'parent' ? '부모님으로\n가입하셨네요!' : '자녀로\n가입하셨네요!'}
        </Text>
        <Text style={styles.description}>
          {role === 'parent'
            ? '안심이가 위험한 문자를 대신 확인하고\n자녀에게 알려드릴게요.'
            : '부모님 폰에 안심이를 설치하고\n6자리 코드로 연결해주세요.'}
        </Text>

        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>시작하는 방법</Text>
          {role === 'parent' ? (
            <>
              <StepItem num="1" text="자녀가 알려준 6자리 코드를 입력해요" />
              <StepItem num="2" text="이제 안심이가 문자를 지켜봐요" />
              <StepItem num="3" text="위험한 문자가 오면 자녀에게 알려줘요" />
            </>
          ) : (
            <>
              <StepItem num="1" text="부모님 폰에 안심이를 설치해드려요" />
              <StepItem num="2" text="6자리 연결 코드를 부모님께 알려드려요" />
              <StepItem num="3" text="이제 부모님이 안전한지 바로 알 수 있어요" />
            </>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleContinue}
        accessibilityLabel="가족 연결 시작"
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>가족 연결하기 →</Text>
      </TouchableOpacity>
    </View>
  );
}

function StepItem({ num, text }: { num: string; text: string }) {
  return (
    <View style={stepStyles.row}>
      <View style={stepStyles.numBadge}>
        <Text style={stepStyles.num}>{num}</Text>
      </View>
      <Text style={stepStyles.text}>{text}</Text>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  numBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  text: { flex: 1, fontSize: 15, color: Colors.textPrimary, lineHeight: 22 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white, padding: 32 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 80, marginBottom: 24 },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 42,
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 40,
  },
  stepCard: {
    width: '100%',
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 24,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  button: {
    height: 60,
    backgroundColor: Colors.brand,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: Colors.white, fontSize: 18, fontWeight: '700' },
});
