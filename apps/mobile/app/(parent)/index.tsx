import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { formatToday } from '@/utils/formatter';
import SafeStatus from '@/components/parent/SafeStatus';
import BlockedCount from '@/components/parent/BlockedCount';

export default function ParentHomeScreen() {
  const { user, family } = useAuthStore();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.appName} accessibilityRole="header">
            🛡️ 안심이
          </Text>
          <Text style={styles.date}>{formatToday()}</Text>
        </View>

        {/* 안전 상태 원형 인디케이터 */}
        <View style={styles.statusSection}>
          <SafeStatus />
        </View>

        {/* 오늘 차단 건수 */}
        <BlockedCount />

        {/* 문자 분석 버튼 */}
        <TouchableOpacity
          style={styles.analyzeBtn}
          onPress={() => router.push('/(parent)/analyze')}
          accessibilityLabel="의심 문자 분석하기"
          accessibilityRole="button"
        >
          <Text style={styles.analyzeBtnIcon}>🔍</Text>
          <View style={styles.analyzeBtnBody}>
            <Text style={styles.analyzeBtnTitle}>의심 문자 확인하기</Text>
            <Text style={styles.analyzeBtnDesc}>
              이상한 문자가 왔나요? 안심이에게 물어보세요
            </Text>
          </View>
          <Text style={styles.analyzeBtnArrow}>→</Text>
        </TouchableOpacity>

        {/* 가족 연결 코드 표시 (가족 미연결 시) */}
        {!family && (
          <View style={styles.codeBox}>
            <Text style={styles.codeBoxTitle}>👨‍👧 자녀와 연결이 필요해요</Text>
            <Text style={styles.codeBoxDesc}>
              자녀 앱에서 연결 코드를 입력하면 시작할 수 있어요
            </Text>
            <TouchableOpacity
              style={styles.codeBoxBtn}
              onPress={() => router.push('/onboarding/connect')}
            >
              <Text style={styles.codeBoxBtnText}>연결하러 가기</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 20 },

  // 헤더
  header: { marginBottom: 8 },
  appName: { fontSize: 30, fontWeight: '800', color: Colors.brand, marginBottom: 4 },
  date: { fontSize: 18, color: Colors.textSecondary },

  // 상태 섹션
  statusSection: { alignItems: 'center' },

  // 분석 버튼
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    gap: 14,
    borderWidth: 2,
    borderColor: Colors.brand,
    shadowColor: Colors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  analyzeBtnIcon: { fontSize: 36 },
  analyzeBtnBody: { flex: 1 },
  analyzeBtnTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.brand,
    marginBottom: 4,
  },
  analyzeBtnDesc: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  analyzeBtnArrow: { fontSize: 22, color: Colors.brand, fontWeight: '700' },

  // 코드 박스
  codeBox: {
    backgroundColor: Colors.cautionBg,
    borderRadius: 16,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.caution + '60',
  },
  codeBoxTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  codeBoxDesc: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
  codeBoxBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.caution,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  codeBoxBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },

});
