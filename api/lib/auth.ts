import type { VercelRequest } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from './supabaseAdmin';

export type AuthContext = {
  userId: string;
  email?: string;
};

export function getBearerToken(req: VercelRequest): string | null {
  const raw = req.headers.authorization;
  if (!raw?.startsWith('Bearer ')) return null;
  const token = raw.slice(7).trim();
  return token.length > 0 ? token : null;
}

/** Supabase JWT 검증 — anon key + getUser(jwt) */
export async function requireAuth(
  req: VercelRequest
): Promise<AuthContext | { status: number; error: string }> {
  const token = getBearerToken(req);
  if (!token) {
    return { status: 401, error: '로그인이 필요합니다' };
  }

  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { status: 503, error: '서버 인증 설정 오류' };
  }

  const authClient = createClient(url, anon);
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    return { status: 401, error: '유효하지 않은 세션입니다' };
  }

  return { userId: data.user.id, email: data.user.email };
}

export async function requireFamilyMember(
  userId: string,
  familyId: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('family_members')
    .select('user_id')
    .eq('family_id', familyId)
    .eq('user_id', userId)
    .maybeSingle();
  return !error && !!data;
}

/** 방침: 양측 동의 완료 시에만 AI 분석 허용 */
export async function requireFamilyConsentComplete(
  familyId: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc('is_family_consent_complete', {
    fam_id: familyId,
  });
  if (error) {
    console.error('is_family_consent_complete RPC 오류:', error);
    return false;
  }
  return data === true;
}

/**
 * 구독 게이트: SUBSCRIPTION_REQUIRED=true(기본)일 때
 * - 자녀: 본인 is_subscribed
 * - 부모: 동일 가족 내 구독 중인 자녀 1명 이상
 */
export async function requireActiveSubscription(
  userId: string,
  familyId: string
): Promise<boolean> {
  if (process.env.SUBSCRIPTION_REQUIRED !== 'true') return true;

  const supabase = getSupabaseAdmin();
  const { data: userRow } = await supabase
    .from('users')
    .select('role, is_subscribed')
    .eq('id', userId)
    .single();

  if (!userRow) return false;

  if (userRow.role === 'child') {
    return userRow.is_subscribed === true;
  }

  const { data: members } = await supabase
    .from('family_members')
    .select('user_id')
    .eq('family_id', familyId);

  const ids = (members ?? []).map((m) => m.user_id as string);
  if (ids.length === 0) return false;

  const { data: children } = await supabase
    .from('users')
    .select('id')
    .in('id', ids)
    .eq('role', 'child')
    .eq('is_subscribed', true)
    .limit(1);

  return (children?.length ?? 0) > 0;
}
