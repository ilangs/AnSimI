import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../lib/supabaseAdmin';

const supabase = getSupabaseAdmin();

/**
 * 만료 blocked_messages 삭제 및 consent_logs 보관 정책 (DB 함수 호출)
 * Vercel Cron: 매일 1회
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results: Record<string, string> = {};

  try {
    const { error: blockedErr } = await supabase.rpc('cleanup_expired_blocked_messages');
    results.blocked_messages = blockedErr ? blockedErr.message : 'ok';
  } catch (e: unknown) {
    results.blocked_messages = e instanceof Error ? e.message : 'error';
  }

  try {
    const { error: consentErr } = await supabase.rpc('delete_old_consent_logs');
    results.consent_logs = consentErr ? consentErr.message : 'ok';
  } catch (e: unknown) {
    results.consent_logs = e instanceof Error ? e.message : 'error';
  }

  return res.status(200).json({ success: true, results });
}
