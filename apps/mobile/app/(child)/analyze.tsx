import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAnalyze } from '@/hooks/useAnalyze';
import AnalyzeResult from '@/components/parent/AnalyzeResult';
import AnalyzeLoadingAnimation from '@/components/parent/AnalyzeLoadingAnimation';

const EXAMPLE_MESSAGES = [
  '[금감원] 귀하의 계좌가 범죄에 이용되고 있습니다. 즉시 자산이전이 필요합니다. 010-xxxx-xxxx',
  '[택배] 고객님 택배가 도착했습니다. 주소 확인: http://bit.ly/xxxxx',
  '[카드사] 승인 완료: 스타벅스 5,500원 (잔액 128,400원)',
];

export default function ChildAnalyzeScreen() {
  const { sharedText } = useLocalSearchParams<{ sharedText?: string }>();
  const [text, setText] = useState('');
  const { analyzeAsync, result, isLoading, error, reset } = useAnalyze();
  const inputRef = useRef<TextInput>(null);

  // Share Intent로 전달된 텍스트 자동 입력
  useEffect(() => {
    if (sharedText) {
      setText(decodeURIComponent(sharedText));
      reset();
    }
  }, [sharedText]);

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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">🔍 문자 분석</Text>
          <Text style={styles.subtitle}>의심스러운 문자를 붙여넣으세요</Text>
          {/* 안내: 위험 감지 시 부모님께 자동 알림 */}
          <View style={styles.noticeBanner}>
            <Text style={styles.noticeText}>
              ⚡ 위험 문자 감지 시 부모님께 자동으로 알림이 가요
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {!result && !isLoading && (
            <>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  value={text}
                  onChangeText={setText}
                  placeholder="문자 내용을 여기에 입력하거나 붙여넣으세요"
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  numberOfLines={6}
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
                    onPress={() => { reset(); setText(msg); }}
                    accessibilityLabel={`예시 ${i + 1} 선택`}
                  >
                    <Text style={styles.exampleNum}>예시 {i + 1}</Text>
                    <Text style={styles.exampleText} numberOfLines={2}>{msg}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {isLoading && <AnalyzeLoadingAnimation />}

          {error && !isLoading && (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorTitle}>분석에 실패했어요</Text>
              <Text style={styles.errorDesc}>{error.message ?? '잠시 후 다시 시도해주세요'}</Text>
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
        </ScrollView>

        {!result && !isLoading && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.analyzeBtn, !text.trim() && styles.analyzeBtnDisabled]}
              onPress={handleAnalyze}
              disabled={!text.trim()}
              accessibilityLabel="문자 분석 시작"
            >
              <Text style={styles.analyzeBtnText}>🛡️ 안심이에게 분석 맡기기</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  flex: { flex: 1 },
  header: { padding: 20, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 17, color: Colors.textSecondary, marginBottom: 12 },
  noticeBanner: {
    backgroundColor: Colors.brandLight ?? '#E8F8F2',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.brand,
  },
  noticeText: { fontSize: 14, color: Colors.brand, fontWeight: '600' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 20 },
  inputWrapper: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 16,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  input: {
    padding: 16,
    fontSize: 18,
    color: Colors.textPrimary,
    lineHeight: 28,
    minHeight: 140,
  },
  charCount: {
    textAlign: 'right',
    padding: 10,
    paddingTop: 4,
    fontSize: 13,
    color: Colors.textTertiary,
  },
  exampleSection: { gap: 10 },
  exampleTitle: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary, marginBottom: 4 },
  exampleBtn: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  exampleNum: { fontSize: 12, fontWeight: '700', color: Colors.brand },
  exampleText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  errorBox: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
    backgroundColor: Colors.dangerBg,
    borderRadius: 16,
  },
  errorIcon: { fontSize: 48 },
  errorTitle: { fontSize: 22, fontWeight: '700', color: Colors.danger },
  errorDesc: { fontSize: 17, color: Colors.textSecondary },
  retryBtn: {
    marginTop: 8,
    backgroundColor: Colors.danger,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryBtnText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  footer: { padding: 20, paddingTop: 12 },
  analyzeBtn: {
    backgroundColor: Colors.brand,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  analyzeBtnDisabled: { opacity: 0.4 },
  analyzeBtnText: { color: Colors.white, fontSize: 20, fontWeight: '800' },
  resetBtn: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  resetBtnText: { fontSize: 17, color: Colors.textPrimary, fontWeight: '600' },
});
