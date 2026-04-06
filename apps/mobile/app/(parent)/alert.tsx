import { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useAlertStore } from '@/stores/alertStore';
import AlertCard from '@/components/parent/AlertCard';

export default function ParentAlertScreen() {
  const router = useRouter();
  const { family } = useAuthStore();
  const { alerts, isLoading, loadAlerts } = useAlertStore();

  useEffect(() => {
    if (family?.id) loadAlerts(family.id);
  }, [family?.id]);

  const dangerAlerts = alerts.filter(
    (a) => a.type === 'danger' || a.type === 'warning'
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          🚨 위험 문자
        </Text>
        <Text style={styles.subtitle}>
          안심이가 차단한 위험 문자 목록이에요
        </Text>
      </View>

      {/* 문자 분석 버튼 (항상 상단에 표시) */}
      <TouchableOpacity
        style={styles.analyzeBtn}
        onPress={() => router.push('/(parent)/analyze')}
        accessibilityLabel="새 문자 분석하기"
        accessibilityRole="button"
      >
        <Text style={styles.analyzeIcon}>🔍</Text>
        <View style={styles.analyzeBtnText}>
          <Text style={styles.analyzeBtnTitle}>의심 문자 분석하기</Text>
          <Text style={styles.analyzeBtnDesc}>
            받은 문자를 붙여넣으면 안심이가 확인해드려요
          </Text>
        </View>
        <Text style={styles.analyzeArrow}>→</Text>
      </TouchableOpacity>

      {/* 차단 이력 목록 */}
      <FlatList
        data={dangerAlerts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <AlertCard alert={item} />}
        ListHeaderComponent={
          dangerAlerts.length > 0 ? (
            <Text style={styles.listHeader}>
              최근 차단 이력 ({dangerAlerts.length}건)
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>위험한 문자가 없어요</Text>
            <Text style={styles.emptySubtitle}>
              안심이가 잘 지키고 있어요
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    padding: 20,
    paddingBottom: 12,
    backgroundColor: Colors.white,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: { fontSize: 16, color: Colors.textSecondary },

  // 분석 버튼
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brand,
    margin: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 18,
    gap: 14,
    shadowColor: Colors.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  analyzeIcon: { fontSize: 32 },
  analyzeBtnText: { flex: 1 },
  analyzeBtnTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 3,
  },
  analyzeBtnDesc: {
    fontSize: 13,
    color: Colors.white + 'CC',
    lineHeight: 18,
  },
  analyzeArrow: { fontSize: 20, color: Colors.white, fontWeight: '700' },

  // 목록
  list: { padding: 16, gap: 12 },
  listHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // 빈 상태
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: { fontSize: 17, color: Colors.textSecondary },
});
