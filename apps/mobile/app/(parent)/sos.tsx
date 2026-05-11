import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import SosButton from '@/components/parent/SosButton';
import { useAuthStore } from '@/stores/authStore';

function InfoItem({ text }: { text: string }) {
  return (
    <View style={infoStyles.row} accessibilityLabel={text}>
      <Text style={infoStyles.bullet} accessibilityElementsHidden>•</Text>
      <Text style={infoStyles.text}>{text}</Text>
    </View>
  );
}

export default function ParentSosScreen() {
  const { family, user } = useAuthStore();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* 타이틀 */}
        <View style={styles.titleSection}>
          <Text style={styles.icon} accessibilityElementsHidden>🆘</Text>
          <Text style={styles.title} accessibilityRole="header">
            SOS 긴급 알림
          </Text>
          <Text style={styles.desc}>
            아래 버튼을 누르면 자녀에게 즉시 알림이 가요
          </Text>
        </View>

        {/* SOS 버튼 */}
        <View style={styles.sosSection}>
          <SosButton
            familyId={family?.id ?? ''}
            senderId={user?.id ?? ''}
            large
          />
        </View>

        {/* 이럴 때 누르세요 */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>이럴 때 누르세요</Text>
          <InfoItem text="모르는 사람이 계좌 이체를 요구할 때" />
          <InfoItem text="경찰·검찰·금감원이라고 전화가 왔을 때" />
          <InfoItem text="개인정보나 비밀번호를 알려달라고 할 때" />
          <InfoItem text="무언가 이상하다고 느껴질 때" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  bullet: { fontSize: 18, color: Colors.danger, lineHeight: 26 },
  text: { flex: 1, fontSize: 16, color: Colors.textPrimary, lineHeight: 26 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 12,
    gap: 16,
  },
  titleSection: { alignItems: 'center', gap: 6 },
  icon: { fontSize: 52 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  desc: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  sosSection: { alignItems: 'center', marginVertical: 4 },
  infoBox: {
    backgroundColor: Colors.dangerBg,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.danger + '40',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.danger,
    marginBottom: 12,
  },
});
