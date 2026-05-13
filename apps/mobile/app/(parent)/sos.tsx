import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
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
  const { height } = useWindowDimensions();
  const isSmallScreen = height < 700;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* 상단: SOS 마크 + 메뉴명 (가로 배치) */}
        <View style={styles.titleRow}>
          <Text style={styles.icon} accessibilityElementsHidden>🆘</Text>
          <View style={styles.titleTextWrap}>
            <Text style={styles.title} accessibilityRole="header">
              SOS 긴급 알림
            </Text>
            <Text style={styles.desc}>
              버튼을 누르면 자녀에게 즉시 알림이 가요
            </Text>
          </View>
        </View>

        {/* 중앙: SOS 버튼 (가로 넓게, 세로 짧게) */}
        <View style={styles.sosSection}>
          <SosButton
            familyId={family?.id ?? ''}
            senderId={user?.id ?? ''}
          />
        </View>

        {/* 하단: 안내 (모두 보이도록) */}
        <View style={[styles.infoBox, isSmallScreen && styles.infoBoxCompact]}>
          <Text style={[styles.infoTitle, isSmallScreen && styles.infoTitleCompact]}>
            이럴 때 누르세요
          </Text>
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
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bullet: { fontSize: 18, color: Colors.danger, lineHeight: 24 },
  text: { flex: 1, fontSize: 15, color: Colors.textPrimary, lineHeight: 24 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },

  // 상단 (가로 타이틀)
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  icon: { fontSize: 44 },
  titleTextWrap: { flex: 1 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  desc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // 중앙 (SOS 버튼)
  sosSection: {
    alignSelf: 'stretch',
    marginVertical: 4,
  },

  // 하단 (안내)
  infoBox: {
    backgroundColor: Colors.dangerBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.danger + '40',
  },
  infoBoxCompact: { padding: 12 },
  infoTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.danger,
    marginBottom: 10,
  },
  infoTitleCompact: { fontSize: 16, marginBottom: 8 },
});
