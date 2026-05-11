import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useAutoAnalyze } from '@/hooks/useAutoAnalyze';

export default function ParentSettingsScreen() {
  const { user, family, signOut } = useAuthStore();
  const { isEnabled, checkPermission, openSettings } = useAutoAnalyze();
  const { width: screenWidth } = useWindowDimensions();
  const signOutWidth = screenWidth * 0.25;

  useEffect(() => { checkPermission(); }, []);

  const handleAutoAnalyzeToggle = async () => {
    if (isEnabled) {
      Alert.alert(
        '자동 분석 비활성화',
        '안드로이드 설정 > 알림 접근 허용 앱에서 안심이를 비활성화하세요.',
        [{ text: '설정 열기', onPress: openSettings }, { text: '취소', style: 'cancel' }]
      );
    } else {
      Alert.alert(
        '자동 문자 분석 활성화',
        '문자 알림이 오면 자동으로 위험 분석하고 결과를 알려드려요.\n\n다음 화면에서 안심이를 활성화해주세요.',
        [{ text: '설정 열기', onPress: openSettings }, { text: '나중에', style: 'cancel' }]
      );
    }
  };

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
        {/* 상단 바: 제목 + 우측 로그아웃 */}
        <View style={styles.topBar}>
          <Text style={styles.title} accessibilityRole="header">
            ⚙️ 설정
          </Text>
          <TouchableOpacity
            style={[styles.topSignOutBtn, { width: signOutWidth }]}
            onPress={handleSignOut}
            accessibilityLabel="로그아웃"
            accessibilityRole="button"
          >
            <Text style={styles.topSignOutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>

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

        {/* 자동 문자 분석 (Android 전용) */}
        {Platform.OS === 'android' && (
          <Section title="자동 문자 분석">
            <TouchableOpacity style={styles.autoRow} onPress={handleAutoAnalyzeToggle}>
              <View style={styles.autoLeft}>
                <Text style={styles.autoTitle}>📡 문자 자동 분석</Text>
                <Text style={styles.autoDesc}>
                  문자 수신 시 자동으로 위험도 분석 후 알림
                </Text>
              </View>
              <View style={[styles.autoStatus, isEnabled ? styles.autoOn : styles.autoOff]}>
                <Text style={styles.autoStatusText}>{isEnabled ? '활성' : '비활성'}</Text>
              </View>
            </TouchableOpacity>
          </Section>
        )}

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
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  topSignOutBtn: {
    backgroundColor: Colors.dangerBg,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.danger + '40',
  },
  topSignOutText: { fontSize: 14, color: Colors.danger, fontWeight: '700' },

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

  autoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  autoLeft: { flex: 1, gap: 3 },
  autoTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  autoDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  autoStatus: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  autoOn: { backgroundColor: Colors.brandLight },
  autoOff: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  autoStatusText: { fontSize: 13, fontWeight: '700', color: Colors.brand },

  version: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 8,
  },
});
