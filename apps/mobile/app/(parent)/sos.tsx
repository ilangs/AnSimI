import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import SosButton from '@/components/parent/SosButton';
import { useAuthStore } from '@/stores/authStore';

interface InfoItemProps {
  text: string;
}

function InfoItem({ text }: InfoItemProps) {
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
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* 타이틀 */}
        <View style={styles.titleSection}>
          <Text style={styles.icon} accessibilityElementsHidden>🆘</Text>
          <Text style={styles.title} accessibilityRole="header">
            SOS 긴급 알림
          </Text>
          <Text style={styles.desc}>
            아래 버튼을 누르면{'\n'}
            자녀 모두에게{'\n'}
            즉시 알림이 가요
          </Text>
        </View>

        {/* SOS 버튼 (최우선, 크게) */}
        <View style={styles.sosSection}>
          <SosButton
            familyId={family?.id ?? ''}
            senderId={user?.id ?? ''}
            large
          />
        </View>

        {/* 이럴 때 누르세요 */}
        <View
          style={styles.infoBox}
          accessibilityLabel="SOS를 눌러야 하는 상황 안내"
        >
          <Text style={styles.infoTitle}>
            이럴 때 누르세요
          </Text>
          <InfoItem text="모르는 사람이 계좌 이체를 요구할 때" />
          <InfoItem text="경찰·검찰·금감원이라고 전화가 왔을 때" />
          <InfoItem text="개인정보나 비밀번호를 알려달라고 할 때" />
          <InfoItem text="무언가 이상하다고 느껴질 때" />
          <InfoItem text="가족에게 빨리 알려야 할 때" />
        </View>

        {/* 안내 문구 */}
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            💡 SOS를 누르면 자녀에게 즉시 알림이 가고{'\n'}
            위치 정보와 함께 연락을 드려요
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 22,
    color: Colors.danger,
    lineHeight: 32,
  },
  text: {
    flex: 1,
    fontSize: 20,   // 어르신 친화 크기
    color: Colors.textPrimary,
    lineHeight: 30,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  container: {
    padding: 24,
    paddingBottom: 40,
    gap: 24,
  },
  titleSection: { alignItems: 'center', gap: 12 },
  icon: { fontSize: 72 },
  title: {
    fontSize: 34,   // 어르신 친화 크기
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  desc: {
    fontSize: 22,   // 어르신 친화 크기
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 34,
  },
  sosSection: { gap: 16 },
  infoBox: {
    backgroundColor: Colors.dangerBg,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: Colors.danger + '40',
  },
  infoTitle: {
    fontSize: 22,   // 어르신 친화 크기
    fontWeight: '800',
    color: Colors.danger,
    marginBottom: 16,
  },
  noteBox: {
    backgroundColor: Colors.brandLight,
    borderRadius: 14,
    padding: 18,
  },
  noteText: {
    fontSize: 17,
    color: Colors.brand,
    lineHeight: 28,
    textAlign: 'center',
    fontWeight: '500',
  },
});
