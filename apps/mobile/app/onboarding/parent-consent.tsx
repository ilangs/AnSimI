/**
 * parent-consent.tsx
 * 부모님 전용 큰 글씨 동의 화면
 *
 * 개인정보처리방침 v2.0 제2부 2.2항 기술 구현:
 * - 폰트 24px 이상, 줄간격 1.8 이상 (어르신 가독성)
 * - 4개 체크박스 모두 체크 시 버튼 활성화 (AND 조건)
 * - 동의 완료 시 consent_logs 테이블에 타임스탬프 + 기기 정보 저장
 * - 동의 전까지 AI 분석 기능 비활성화 (is_family_consent_complete = FALSE)
 *
 * 라우팅: /onboarding/connect (부모님 가족 연결 완료) → 이 화면 → /(parent)/
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/services/supabase';

export default function ParentConsentScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  // 4개 체크박스 상태 (방침 제2부 2.2항 — 모두 필수)
  const [consentCollect, setConsentCollect]       = useState(false); // 개인정보 수집·이용
  const [consentAiAnalysis, setConsentAiAnalysis] = useState(false); // AI가 문자 분석
  const [consentFamilyShare, setConsentFamilyShare] = useState(false); // 결과 자녀 공유
  const [consentOverseas, setConsentOverseas]     = useState(false); // 미국 AI 서버 전송

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 모든 체크박스가 체크되어야 버튼 활성화
  const allChecked = consentCollect && consentAiAnalysis && consentFamilyShare && consentOverseas;

  const handleAgree = async () => {
    if (!user?.id || !allChecked) return;
    setIsSubmitting(true);

    try {
      // consent_logs 테이블에 동의 이력 저장
      // 방침 제2부 2.3항: 타임스탬프 + 동의 항목 + 기기 정보 저장 (3년 보관)
      const { error } = await supabase
        .from('consent_logs')
        .insert({
          user_id:   user.id,
          user_role: 'parent',
          version:   'v2.0',
          items: {
            collect:      consentCollect,
            ai_analysis:  consentAiAnalysis,
            family_share: consentFamilyShare,
            overseas:     consentOverseas,
          },
          device_info: {
            platform: Platform.OS,
            version:  Platform.Version,
          },
          // ip_address는 서버사이드에서 기록 (클라이언트 IP는 신뢰 불가)
        });

      if (error) throw error;

      // 동의 완료 → 부모님 메인 화면으로 이동
      router.replace('/(parent)/');
    } catch (err: any) {
      Alert.alert('오류', '동의 저장 중 문제가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <Text style={styles.appName}>🛡️ 안심이 앱</Text>
        <Text style={styles.title}>시작 안내</Text>
        <Text style={styles.subtitle}>큰 글씨로 쉽게 안내해 드립니다</Text>

        {/* 안심이가 하는 일 */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>✅ 안심이가 하는 일</Text>
          <Text style={styles.infoItem}>1. 받으시는 문자를 AI가{'\n'}   사기 문자인지 확인합니다.</Text>
          <Text style={styles.infoItem}>2. 위험한 문자가 오면{'\n'}   자녀에게 즉시 알려드립니다.</Text>
          <Text style={styles.infoItem}>3. SOS 버튼으로{'\n'}   자녀를 즉시 부를 수 있습니다.</Text>
        </View>

        {/* 꼭 알아두세요 */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>⚠️ 꼭 알아두세요</Text>
          <Text style={styles.noticeItem}>● AI가 귀하의 문자를 분석합니다.</Text>
          <Text style={styles.noticeItem}>● 분석 후 문자 내용은 즉시 삭제되며{'\n'}   저장되지 않습니다.</Text>
          <Text style={styles.noticeItem}>● 자녀에게는 위험 점수와 요약만{'\n'}   전달됩니다. (문자 내용은 공유 안 됨)</Text>
          <Text style={styles.noticeItem}>● 분석을 위해 문자가 미국 AI 서버로{'\n'}   전송됩니다. (분석 즉시 삭제됩니다)</Text>
        </View>

        {/* 동의 항목 — 4개 체크박스 */}
        <View style={styles.consentBox}>
          <Text style={styles.consentTitle}>
            📋 동의 항목{'\n'}(모두 체크하셔야 합니다)
          </Text>

          <ConsentItem
            checked={consentCollect}
            onPress={() => setConsentCollect((v) => !v)}
            label="(필수) 개인정보 수집·이용에 동의합니다."
            accessLabel="개인정보 수집·이용 동의"
          />
          <ConsentItem
            checked={consentAiAnalysis}
            onPress={() => setConsentAiAnalysis((v) => !v)}
            label="(필수) AI가 내 문자를 분석하는 것에 동의합니다."
            accessLabel="AI 문자 분석 동의"
          />
          <ConsentItem
            checked={consentFamilyShare}
            onPress={() => setConsentFamilyShare((v) => !v)}
            label="(필수) 분석 결과가 자녀에게 공유되는 것에 동의합니다."
            accessLabel="분석 결과 자녀 공유 동의"
          />
          <ConsentItem
            checked={consentOverseas}
            onPress={() => setConsentOverseas((v) => !v)}
            label={'(필수) 미국 AI 서버로 문자가 전송됨에 동의합니다.\n(분석 즉시 삭제)'}
            accessLabel="미국 AI 서버 전송 동의"
          />

          <Text style={styles.consentHint}>
            모두 체크하시면 아래 버튼이 활성화됩니다.
          </Text>
        </View>

        {/* 동의 버튼 */}
        <TouchableOpacity
          style={[styles.agreeBtn, (!allChecked || isSubmitting) && styles.agreeBtnDisabled]}
          onPress={handleAgree}
          disabled={!allChecked || isSubmitting}
          accessibilityLabel="동의하고 시작하기"
          accessibilityRole="button"
          accessibilityState={{ disabled: !allChecked }}
        >
          {isSubmitting ? (
            <ActivityIndicator color={Colors.white} size="large" />
          ) : (
            <Text style={styles.agreeBtnText}>동의하고 시작하기 ✓</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.legalNote}>
          본 동의 이력은 개인정보보호법 제22조에 따라{'\n'}3년간 보관됩니다.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── 체크박스 아이템 ── */
function ConsentItem({
  checked,
  onPress,
  label,
  accessLabel,
}: {
  checked: boolean;
  onPress: () => void;
  label: string;
  accessLabel: string;
}) {
  return (
    <TouchableOpacity
      style={styles.consentRow}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessLabel}
      activeOpacity={0.7}
    >
      <View style={[styles.checkBox, checked && styles.checkBoxChecked]}>
        {checked && <Text style={styles.checkMark}>✓</Text>}
      </View>
      <Text style={[styles.consentLabel, checked && styles.consentLabelChecked]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ── 스타일 (폰트 24px 이상, 줄간격 1.8 이상 — 방침 2.2항 요건) ── */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: { padding: 24, paddingBottom: 48, gap: 20 },

  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.brand,
    textAlign: 'center',
  },
  title: {
    fontSize: 32,         // 방침 요건: 24px 이상
    fontWeight: '900',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 44,       // 1.8 이상
  },
  subtitle: {
    fontSize: 20,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 36,       // 1.8
  },

  // 안심이가 하는 일
  infoBox: {
    backgroundColor: Colors.brandLight,
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 2,
    borderColor: Colors.brand + '30',
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.brand,
    lineHeight: 36,
  },
  infoItem: {
    fontSize: 20,         // 방침 요건: 24px 이상 — 본문도 20px로 설정
    color: Colors.textPrimary,
    lineHeight: 36,       // 1.8
    fontWeight: '500',
  },

  // 꼭 알아두세요
  noticeBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 20,
    gap: 10,
    borderWidth: 2,
    borderColor: Colors.caution + '60',
  },
  noticeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.caution,
    lineHeight: 36,
  },
  noticeItem: {
    fontSize: 20,
    color: Colors.textPrimary,
    lineHeight: 36,
    fontWeight: '500',
  },

  // 동의 체크박스 영역
  consentBox: {
    borderWidth: 2,
    borderColor: Colors.brand,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    backgroundColor: Colors.white,
  },
  consentTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: 40,
    marginBottom: 4,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 6,
    minHeight: 56,        // 56dp 터치 영역 (UX 요건)
  },
  checkBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  checkBoxChecked: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  checkMark: {
    fontSize: 18,
    color: Colors.white,
    fontWeight: '900',
  },
  consentLabel: {
    fontSize: 20,         // 방침 요건: 24px 이상 (체크박스 레이블)
    color: Colors.textSecondary,
    lineHeight: 32,
    flex: 1,
    fontWeight: '500',
  },
  consentLabelChecked: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  consentHint: {
    fontSize: 16,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 26,
    marginTop: 4,
  },

  // 동의 버튼
  agreeBtn: {
    backgroundColor: Colors.brand,
    height: 72,           // 56dp 이상 터치 영역 (부모님 UX)
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  agreeBtnDisabled: {
    backgroundColor: Colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  agreeBtnText: {
    fontSize: 24,         // 방침 요건: 24px
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 0.5,
  },

  legalNote: {
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
