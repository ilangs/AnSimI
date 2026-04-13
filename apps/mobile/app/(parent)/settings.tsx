import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';

export default function ParentSettingsScreen() {
  const { user, family, signOut } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} accessibilityRole="header">
          ⚙️ 설정
        </Text>

        {/* 계정 정보 */}
        <Section title="계정">
          <InfoRow label="이름" value={user?.name ?? '-'} />
          <InfoRow label="이메일" value={user?.email ?? '-'} />
        </Section>

        {/* 가족 연결 정보 */}
        <Section title="가족 연결">
          <InfoRow label="가족 이름" value={family?.name ?? '-'} />
          <InfoRow label="연결 코드" value={family?.code ?? '---'} />
        </Section>

        {/* 개인정보 */}
        <Section title="개인정보 및 법적 고지">
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => Linking.openURL('https://an-sim-i.vercel.app/privacy')}
            accessibilityLabel="개인정보처리방침 보기"
            accessibilityRole="link"
          >
            <Text style={styles.menuRowText}>🔒 개인정보처리방침</Text>
            <Text style={styles.menuRowArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.zeroStorageNotice}>
            <Text style={styles.zeroStorageTitle}>🛡️ Zero-Storage 원칙</Text>
            <Text style={styles.zeroStorageDesc}>
              문자 원문은 AI 분석 후 즉시 파기되며 서버에 저장되지 않습니다.
            </Text>
          </View>
        </Section>

        {/* 로그아웃 */}
        <Section title="기타">
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleSignOut}
            accessibilityLabel="로그아웃"
            accessibilityRole="button"
          >
            <Text style={styles.signOutText}>로그아웃</Text>
          </TouchableOpacity>
        </Section>

        <Text style={styles.version}>안심이 v1.0.0 · 안심이가 지켜드릴게요 🛡️</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sec.wrap}>
      <Text style={sec.title}>{title}</Text>
      <View style={sec.card}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={row.wrap}>
      <Text style={row.label}>{label}</Text>
      <Text style={row.value}>{value}</Text>
    </View>
  );
}

const sec = StyleSheet.create({
  wrap: { marginBottom: 22 },
  title: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
});

const row = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  label: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
  value: { fontSize: 14, color: Colors.textSecondary, flexShrink: 1, textAlign: 'right' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingTop: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginBottom: 22 },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuRowText: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  menuRowArrow: { fontSize: 18, color: Colors.textTertiary },

  zeroStorageNotice: {
    margin: 12,
    padding: 12,
    backgroundColor: Colors.brandLight,
    borderRadius: 10,
    gap: 4,
  },
  zeroStorageTitle: { fontSize: 13, fontWeight: '700', color: Colors.brand },
  zeroStorageDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },

  signOutBtn: { padding: 16, alignItems: 'center' },
  signOutText: { fontSize: 16, color: Colors.danger, fontWeight: '600' },

  version: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 8,
  },
});
