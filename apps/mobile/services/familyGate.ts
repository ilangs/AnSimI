import { supabase } from '@/services/supabase';

/** 본인 유효 동의 이력 존재 여부 */
export async function hasUserConsent(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('consent_logs')
    .select('id')
    .eq('user_id', userId)
    .is('withdrawn_at', null)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('consent 조회 오류:', error);
    return false;
  }
  return !!data;
}

/** 부모·자녀 양측 동의 완료 (AI 분석 서버 게이트와 동일) */
export async function isFamilyConsentComplete(familyId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_family_consent_complete', {
    fam_id: familyId,
  });
  if (error) {
    console.error('is_family_consent_complete 오류:', error);
    return false;
  }
  return data === true;
}

/** 분석 전 클라이언트 사전 검증 — 서버 403 메시지와 맞춤 */
export async function assertCanAnalyze(
  userId: string,
  familyId: string,
  userRole: 'parent' | 'child'
): Promise<void> {
  if (userRole === 'parent') {
    const own = await hasUserConsent(userId);
    if (!own) {
      throw new Error('부모님 동의 화면에서 동의를 완료해주세요.');
    }
  }

  const familyOk = await isFamilyConsentComplete(familyId);
  if (!familyOk) {
    throw new Error(
      userRole === 'child'
        ? '부모님 동의가 완료될 때까지 잠시 기다려주세요.'
        : '자녀 회원가입·동의가 완료되어야 분석을 시작할 수 있어요.'
    );
  }
}
