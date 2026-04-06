/**
 * objection.tsx — 오판정 신고 화면 (부모님 앱)
 *
 * 개인정보처리방침 v2.0 제4부 구현:
 * - 3가지 신고 유형: 오탐(false_positive) / 미탐(false_negative) / 기타
 * - 제출 시 objections 테이블에 저장
 * - SLA 72H 이내 처리 안내 표시
 * - 이의신청 이력 2년 보관 (DB 레벨)
 *
 * 라우팅: (parent)/alert.tsx의 AlertCard → '오판정 신고' 버튼 → 이 화면
 * params: messageId (UUID), originalScore (number)
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/services/supabase';

type ObjectionType = 'false_positive' | 'false_negative' | 'other';

const OBJECTION_OPTIONS: { type: ObjectionType; icon: string; label: string; desc: string }[] = [
  {
    type: 'false_positive',
    icon: '✅',
    label: '정상 문자인데 위험으로 분류됐어요',
    desc: '실제로는 안전한 문자인데 AI가 위험하다고 판단한 경우',
  },
  {
    type: 'false_negative',
    icon: '⚠️',
    label: '사기 문자인데 안전으로 분류됐어요',
    desc: '사기가 의심되는 문자인데 AI가 안전하다고 판단한 경우',
  },
  {
    type: 'other',
    icon: '💬',
    label: '기타',
    desc: '위에 해당하지 않는 다른 문제가 있어요',
  },
];

export default function ObjectionScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{ messageId?: string; originalScore?: string }>();

  const [selectedType, setSelectedType] = useState<ObjectionType | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user?.id || !selectedType) {
      Alert.alert('알림', '신고 유형을 선택해주세요');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('objections')
        .insert({
          user_id:        user.id,
          message_id:     params.messageId ?? null,
          objection_type: selectedType,
          description:    description.trim() || null,
          original_score: params.originalScore ? parseInt(params.originalScore, 10) : null,
          status:         'pending',
        });

      if (error) throw error;

      Alert.alert(
        '신고 접수 완료 ✓',
        '72시간 이내에 검토 결과를 알려드립니다.\n불편을 드려서 죄송합니다.',
        [{ text: '확인', onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert('오류', '신고 접수 중 문제가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 헤더 */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            accessibilityLabel="뒤로 가기"
            accessibilityRole="button"
          >
            <Text style={styles.backText}>← 뒤로</Text>
          </TouchableOpacity>

          <Text style={styles.title} accessibilityRole="header">
            📣 오판정 신고
          </Text>
          <Text style={styles.subtitle}>
            AI가 이 문자를 잘못 분류했나요?{'\n'}
            신고해 주시면 <Text style={styles.slaText}>72시간 이내</Text>에 다시 검토해 드립니다.
          </Text>

          {/* 신고 유형 선택 */}
          <Text style={styles.sectionLabel}>신고 유형을 선택해주세요</Text>
          {OBJECTION_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.type}
              style={[
                styles.optionCard,
                selectedType === opt.type && styles.optionCardSelected,
              ]}
              onPress={() => setSelectedType(opt.type)}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedType === opt.type }}
              accessibilityLabel={opt.label}
              activeOpacity={0.75}
            >
              <View style={styles.optionHeader}>
                <View style={[
                  styles.radioCircle,
                  selectedType === opt.type && styles.radioCircleSelected,
                ]}>
                  {selectedType === opt.type && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.optionIcon}>{opt.icon}</Text>
                <Text style={[
                  styles.optionLabel,
                  selectedType === opt.type && styles.optionLabelSelected,
                ]}>
                  {opt.label}
                </Text>
              </View>
              <Text style={styles.optionDesc}>{opt.desc}</Text>
            </TouchableOpacity>
          ))}

          {/* 추가 설명 입력 */}
          <Text style={styles.sectionLabel}>추가 설명 (선택 사항)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="어떤 문제가 있었는지 자세히 알려주세요..."
            placeholderTextColor={Colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
            accessibilityLabel="추가 설명 입력"
          />
          <Text style={styles.charCount}>{description.length}/500</Text>

          {/* SLA 안내 */}
          <View style={styles.slaBox}>
            <Text style={styles.slaBoxTitle}>🕐 처리 일정 안내</Text>
            <Text style={styles.slaBoxText}>
              접수 → 24H: AI 자동 재분석{'\n'}
              24H → 48H: 결과 불일치 시 담당자 검토{'\n'}
              48H → 72H: 최종 판정 앱 알림 + 이메일 통보
            </Text>
          </View>

          {/* 제출 버튼 */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!selectedType || isSubmitting) && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!selectedType || isSubmitting}
            accessibilityLabel="신고 제출하기"
            accessibilityRole="button"
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.submitBtnText}>신고 제출하기</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.legalNote}>
            이의신청 처리 이력은 이용약관에 따라 2년간 보관됩니다.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 48 },

  backBtn: { marginBottom: 16 },
  backText: { fontSize: 16, color: Colors.brand, fontWeight: '600' },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: 28,
  },
  slaText: { color: Colors.brand, fontWeight: '700' },

  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  // 유형 선택 카드
  optionCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 10,
    gap: 8,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  optionCardSelected: {
    borderColor: Colors.brand,
    backgroundColor: Colors.brandLight,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioCircleSelected: { borderColor: Colors.brand },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.brand,
  },
  optionIcon: { fontSize: 20 },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
    flexWrap: 'wrap',
  },
  optionLabelSelected: { color: Colors.brand },
  optionDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    paddingLeft: 32,
  },

  // 텍스트 입력
  textArea: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    minHeight: 110,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 20,
  },

  // SLA 안내 박스
  slaBox: {
    backgroundColor: Colors.brandLight,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.brand + '30',
  },
  slaBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.brand,
  },
  slaBoxText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  // 제출 버튼
  submitBtn: {
    backgroundColor: Colors.brand,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 14,
  },
  submitBtnDisabled: {
    backgroundColor: Colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: { fontSize: 17, fontWeight: '800', color: Colors.white },

  legalNote: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
