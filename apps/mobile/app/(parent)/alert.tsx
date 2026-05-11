import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useAlertStore } from '@/stores/alertStore';
import { useAnalyze } from '@/hooks/useAnalyze';
import AlertCard from '@/components/parent/AlertCard';
import AnalyzeResult from '@/components/parent/AnalyzeResult';
import AnalyzeLoadingAnimation from '@/components/parent/AnalyzeLoadingAnimation';

const EXAMPLE_MESSAGES = [
  '[금감원] 귀하의 계좌가 범죄에 이용되고 있습니다. 즉시 자산이전이 필요합니다. 010-xxxx-xxxx',
  '[택배] 고객님 택배가 도착했습니다. 주소 확인: http://bit.ly/xxxxx',
];

export default function ParentAlertScreen() {
  const { family } = useAuthStore();
  const { alerts, loadAlerts } = useAlertStore();
  const { analyzeAsync, result, isLoading, error, reset } = useAnalyze();
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (family?.id) loadAlerts(family.id);
  }, [family?.id]);

  const dangerAlerts = alerts
    .filter((a) => a.type === 'danger' || a.type === 'warning')
    .slice(0, 10); // 최근 10건만

  const handleAnalyze = async () => {
    if (!text.trim()) {
      Alert.alert('알림', '분석할 문자 내용을 입력해주세요');
      return;
    }
    reset();
    try {
      await analyzeAsync(text.trim());
    } catch {
      // error 상태로 자동 관리
    }
  };

  const handleReset = () => {
    reset();
    setText('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              🚨 위험 문자
            </Text>
            <Text style={styles.subtitle}>
              안심이가 차단한 위험 문자 목록이에요
            </Text>
          </View>

          {/* ① 최근 차단 이력 (상단) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              최근 차단 이력 ({dangerAlerts.length}건)
            </Text>
            {dangerAlerts.length > 0 ? (
              <FlatList
                data={dangerAlerts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <AlertCard alert={item} />}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>✅</Text>
                <Text style={styles.emptyTitle}>위험한 문자가 없어요</Text>
                <Text style={styles.emptySubtitle}>
                  안심이가 잘 지키고 있어요
                </Text>
              </View>
            )}
          </View>

          {/* ② 의심 문자 분석하기 (하단, 동일 화면 통합) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔍 의심 문자 분석하기</Text>

            {!result && !isLoading && (
              <>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={inputRef}
                    style={styles.input}
                    value={text}
                    onChangeText={setText}
                    placeholder="이상한 문자를 여기에 붙여넣으세요"
                    placeholderTextColor={Colors.textTertiary}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    maxLength={2000}
                    accessibilityLabel="문자 내용 입력"
                  />
                  <Text style={styles.charCount}>{text.length}/2000</Text>
                </View>

                <View style={styles.exampleSection}>
                  <Text style={styles.exampleTitle}>예시로 테스트해보세요</Text>
                  {EXAMPLE_MESSAGES.map((msg, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.exampleBtn}
                      onPress={() => {
                        reset();
                        setText(msg);
                      }}
                      accessibilityLabel={`예시 ${i + 1} 선택`}
                    >
                      <Text style={styles.exampleNum}>예시 {i + 1}</Text>
                      <Text style={styles.exampleText} numberOfLines={2}>
                        {msg}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.analyzeBtn,
                    !text.trim() && styles.analyzeBtnDisabled,
                  ]}
                  onPress={handleAnalyze}
                  disabled={!text.trim()}
                  accessibilityLabel="문자 분석 시작"
                  accessibilityRole="button"
                >
                  <Text style={styles.analyzeBtnText}>
                    🛡️ 안심이에게 분석 맡기기
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {isLoading && <AnalyzeLoadingAnimation />}

            {error && !isLoading && (
              <View style={styles.errorBox}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorTitle}>분석에 실패했어요</Text>
                <Text style={styles.errorDesc}>
                  {error.message ?? '잠시 후 다시 시도해주세요'}
                </Text>
                <TouchableOpacity style={styles.retryBtn} onPress={handleAnalyze}>
                  <Text style={styles.retryBtnText}>다시 분석하기</Text>
                </TouchableOpacity>
              </View>
            )}

            {result && !isLoading && (
              <>
                <AnalyzeResult result={result} originalText={text} />
                <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                  <Text style={styles.resetBtnText}>🔄 새 문자 분석하기</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { paddingBottom: 40 },

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

  section: { padding: 16, paddingTop: 18 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 12,
  },

  // 빈 상태
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: Colors.white,
    borderRadius: 14,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary },

  // 입력창
  inputWrapper: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 14,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    marginBottom: 14,
  },
  input: {
    padding: 14,
    fontSize: 17,
    color: Colors.textPrimary,
    lineHeight: 26,
    minHeight: 120,
  },
  charCount: {
    textAlign: 'right',
    padding: 8,
    paddingTop: 2,
    fontSize: 12,
    color: Colors.textTertiary,
  },

  // 예시
  exampleSection: { gap: 8, marginBottom: 14 },
  exampleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  exampleBtn: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  exampleNum: { fontSize: 11, fontWeight: '700', color: Colors.brand },
  exampleText: { fontSize: 13, color: Colors.textPrimary, lineHeight: 18 },

  // 분석 버튼
  analyzeBtn: {
    backgroundColor: Colors.brand,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  analyzeBtnDisabled: { opacity: 0.4 },
  analyzeBtnText: { color: Colors.white, fontSize: 18, fontWeight: '800' },

  // 에러
  errorBox: {
    alignItems: 'center',
    padding: 28,
    gap: 10,
    backgroundColor: Colors.dangerBg,
    borderRadius: 14,
  },
  errorIcon: { fontSize: 40 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: Colors.danger },
  errorDesc: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn: {
    marginTop: 6,
    backgroundColor: Colors.danger,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },

  // 재분석
  resetBtn: {
    alignItems: 'center',
    padding: 14,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginTop: 12,
  },
  resetBtnText: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
});
