import { supabase } from '@/services/supabase';

/** Vercel API 호출용 Authorization + JSON 헤더 */
export async function getApiAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

/** EXPO_PUBLIC_API_URL=https://host/api → https://host (결제 콜백 등) */
export function getWebOriginFromApiUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL ?? '';
  return url.replace(/\/api\/?$/, '');
}
