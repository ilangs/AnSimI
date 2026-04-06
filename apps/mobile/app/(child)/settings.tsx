import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Share,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';
import { supabase } from '@/services/supabase';
import { startSubscription, cancelSubscription, SUBSCRIPTION_PRICE } from '@/services/payment';

export default function ChildSettingsScreen() {
  const router = useRouter();
  const { user, family, signOut, setFamily } = useAuthStore();
  const { members } = useFamilyStore();

  // 알림 설정 상태
  const [dangerNotify, setDangerNotify] = useState(true);
  const [warningNotify, setWarningNotify] = useState(true);
  const [sosNotify, setSosNotify] = useState(true);

  const parents = members.filter((m) => m.user?.role === 'parent');

  // 연결 코드 공유
  const handleShareCode = async () => {
    if (!family?.code) return;
    try {
      await Share.share({
        message: `안심이 앱 가족 연결 코드: ${family.code}\n\n부모님 앱 → 가족 연결 → 코드 입력`,
        title: '안심이 가족 연결 코드',
      });
    } catch {}
  };

  // 가족 구성원 제거
  const handleRemoveMember = (userId: string, name: string) => {
    Alert.alert(
      '가족 제거',
      `${name}님을 가족 그룹에서 제거할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '제거',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase
                .from('family_members')
                .delete()
                .eq('family_id', family?.id)
                .eq('user_id', userId);
              Alert.alert('완료', '가족 구성원을 제거했어요');
            } catch {
              Alert.alert('오류', '잠시 후 다시 시도해주세요');
            }
          },
        },
      ]
    );
  };

  // 구독 시작
  const [isSubscribing, setIsSubscribing] = useState(false);
  const handleSubscribe = async () => {
    Alert.alert(
      '구독 시작',
      `₩${SUBSCRIPTION_PRICE.toLocaleString()}/월 요금이 청구됩니다.\n부모님 앱은 영구 무료예요.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '구독하기',
          onPress: async () => {
            if (!user?.id) return;
            setIsSubscribing(true);
            try {
              const result = await startSubscription(user.id, user.email);
              if (!result.success) {
                Alert.alert('결제 실패', result.error ?? '잠시 후 다시 시도해주세요');
              }
              // 결제 완료는 콜백/웹훅으로 처리됨
            } finally {
              setIsSubscribing(false);
            }
          },
        },
      ]
    );
  };

  // 구독 해지
  const handleCancelSubscription = () => {
    Alert.alert(
      '구독 해지',
      '구독을 해지하면 부모님 보호 기능이 제한됩니다.\n정말 해지하시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '해지하기',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            const ok = await cancelSubscription(user.id);
            if (ok) {
              Alert.alert('해지 완료', '구독이 해지되었습니다');
            } else {
              Alert.alert('오류', '잠시 후 다시 시도해주세요');
            }
          },
        },
      ]
    );
  };

  // 로그아웃
  const handleSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title} accessibilityRole="header">⚙️ 설정</Text>

        {/* ── 계정 정보 ── */}
        <Section title="계정">
          <InfoRow label="이름" value={user?.name ?? '-'} />
          <InfoRow label="이메일" value={user?.email ?? '-'} />
          <InfoRow
            label="구독 상태"
            value={user?.is_subscribed ? '✅ 구독 중 (₩3,900/월)' : '❌ 미구독'}
            valueColor={user?.is_subscribed ? Colors.safe : Colors.danger}
          />
        </Section>

        {/* ── 가족 연결 ── */}
        <Section title="가족 연결">
          <InfoRow label="가족 이름" value={family?.name ?? '-'} />
          <View style={styles.codeRow}>
            <Text style={styles.codeLabel}>연결 코드</Text>
            <Text style={styles.codeValue}>{family?.code ?? '---'}</Text>
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={handleShareCode}
              accessibilityLabel="연결 코드 공유하기"
            >
              <Text style={styles.shareBtnText}>공유</Text>
            </TouchableOpacity>
          </View>

          {/* 부모님 목록 */}
          {parents.map((m) => (
            <View key={m.user_id} style={styles.memberRow}>
              <Text style={styles.memberIcon}>👴</Text>
              <Text style={styles.memberName}>{m.user?.name ?? '부모님'}</Text>
              <TouchableOpacity
                style={styles.removeMemberBtn}
                onPress={() => handleRemoveMember(m.user_id, m.user?.name ?? '부모님')}
                accessibilityLabel={`${m.user?.name ?? '부모님'} 제거`}
              >
                <Text style={styles.removeMemberText}>제거</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addFamilyBtn}
            onPress={() => router.push('/onboarding/connect')}
            accessibilityLabel="가족 추가하기"
            accessibilityRole="button"
          >
            <Text style={styles.addFamilyBtnText}>+ 가족 추가하기</Text>
          </TouchableOpacity>
        </Section>

        {/* ── 알림 설정 ── */}
        <Section title="알림 설정">
          <SwitchRow
            label="🛑 매우위험 알림"
            description="위험도 76점 이상 (즉시 알림)"
            value={dangerNotify}
            onValueChange={setDangerNotify}
          />
          <SwitchRow
            label="🚨 위험 알림"
            description="위험도 51~75점"
            value={warningNotify}
            onValueChange={setWarningNotify}
          />
          <SwitchRow
            label="🆘 SOS 알림"
            description="부모님이 SOS 버튼을 눌렀을 때"
            value={sosNotify}
            onValueChange={setSosNotify}
          />
        </Section>

        {/* ── 구독 관리 ── */}
        {!user?.is_subscribed ? (
          <Section title="구독 관리">
            <View style={styles.subscribeCard}>
              <Text style={styles.subscribePlan}>안심이 자녀 플랜</Text>
              <Text style={styles.subscribePrice}>₩3,900</Text>
              <Text style={styles.subscribeUnit}>/월</Text>
              <Text style={styles.subscribeDesc}>
                부모님 앱은 영구 무료 · 언제든 해지 가능
              </Text>
              <TouchableOpacity
                style={[styles.subscribeBtn, isSubscribing && { opacity: 0.6 }]}
                onPress={handleSubscribe}
                disabled={isSubscribing}
                accessibilityLabel="구독 시작하기 월 3900원"
                accessibilityRole="button"
              >
                {isSubscribing
                  ? <ActivityIndicator color={Colors.white} />
                  : <Text style={styles.subscribeBtnText}>구독 시작하기</Text>
                }
              </TouchableOpacity>
            </View>
          </Section>
        ) : (
          <Section title="구독 관리">
            <InfoRow label="플랜" value="자녀 플랜 (₩3,900/월)" />
            <TouchableOpacity
              style={styles.cancelSubBtn}
              onPress={handleCancelSubscription}
              accessibilityLabel="구독 해지하기"
            >
              <Text style={styles.cancelSubText}>구독 해지</Text>
            </TouchableOpacity>
          </Section>
        )}

        {/* ── 개인정보 및 법적 고지 ── */}
        <Section title="개인정보 및 법적 고지">
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => Linking.openURL('https://ansimi.vercel.app/privacy')}
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
              분석 결과(위험도·요약)만 보관됩니다.
            </Text>
          </View>
        </Section>

        {/* ── 기타 ── */}
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

/* ── 하위 컴포넌트 ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sec.wrap}>
      <Text style={sec.title}>{title}</Text>
      <View style={sec.card}>{children}</View>
    </View>
  );
}

function InfoRow({
  label, value, valueColor,
}: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={row.wrap}>
      <Text style={row.label}>{label}</Text>
      <Text style={[row.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function SwitchRow({
  label, description, value, onValueChange,
}: { label: string; description: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={row.wrap}>
      <View style={row.switchLeft}>
        <Text style={row.label}>{label}</Text>
        <Text style={row.desc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: Colors.brand, false: Colors.border }}
        thumbColor={Colors.white}
        accessibilityLabel={label}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
      />
    </View>
  );
}

/* ── 스타일 ── */
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
  switchLeft: { flex: 1, paddingRight: 12 },
  desc: { fontSize: 12, color: Colors.textTertiary, marginTop: 3, lineHeight: 18 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingTop: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginBottom: 22 },

  // 코드 행
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 10,
  },
  codeLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  codeValue: {
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    color: Colors.brand,
    letterSpacing: 6,
  },
  shareBtn: {
    backgroundColor: Colors.brandLight,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  shareBtnText: { fontSize: 14, fontWeight: '700', color: Colors.brand },

  // 멤버 행
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 16,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  memberIcon: { fontSize: 22 },
  memberName: { flex: 1, fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  removeMemberBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  removeMemberText: { fontSize: 13, color: Colors.danger, fontWeight: '600' },

  // 가족 추가 버튼
  addFamilyBtn: { padding: 16, alignItems: 'center' },
  addFamilyBtnText: { fontSize: 15, color: Colors.brand, fontWeight: '700' },

  // 구독 카드
  subscribeCard: {
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  subscribePlan: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  subscribePrice: { fontSize: 36, fontWeight: '900', color: Colors.brand },
  subscribeUnit: { fontSize: 16, color: Colors.textSecondary, marginTop: -8 },
  subscribeDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  subscribeBtn: {
    marginTop: 14,
    backgroundColor: Colors.brand,
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: Colors.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  subscribeBtnText: { color: Colors.white, fontSize: 17, fontWeight: '800' },

  // 구독 해지
  cancelSubBtn: { padding: 16, alignItems: 'center' },
  cancelSubText: { fontSize: 15, color: Colors.danger },

  // 로그아웃
  signOutBtn: { padding: 16, alignItems: 'center' },
  signOutText: { fontSize: 16, color: Colors.danger, fontWeight: '600' },

  // 개인정보 메뉴 행
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

  // Zero-Storage 안내 배너
  zeroStorageNotice: {
    margin: 12,
    padding: 12,
    backgroundColor: Colors.brandLight,
    borderRadius: 10,
    gap: 4,
  },
  zeroStorageTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.brand,
  },
  zeroStorageDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  version: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 8,
  },
});
