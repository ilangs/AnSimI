import { createClient, SupabaseClient } from '@supabase/supabase-js';

let admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!admin) {
    admin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return admin;
}
