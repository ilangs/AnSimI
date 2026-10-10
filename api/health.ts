import type { VercelRequest, VercelResponse } from '@vercel/node';

const REQUIRED = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'OPENAI_API_KEY',
] as const;

const OPTIONAL = [
  'GOOGLE_SAFE_BROWSING_API_KEY',
  'TOSS_SECRET_KEY',
  'CRON_SECRET',
  'SUBSCRIPTION_REQUIRED',
  'ANALYZE_RATE_LIMIT_PER_MINUTE',
] as const;

export default function handler(req: VercelRequest, res: VercelResponse) {
  const missing = REQUIRED.filter((k) => !process.env[k]?.trim());

  const body = {
    status: missing.length === 0 ? 'ok' : 'degraded',
    service: '안심이 API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    checks: {
      requiredEnv: missing.length === 0,
      missingRequired: missing,
      optionalPresent: Object.fromEntries(
        OPTIONAL.map((k) => [k, Boolean(process.env[k]?.trim())])
      ),
      subscriptionRequired: process.env.SUBSCRIPTION_REQUIRED === 'true',
    },
  };

  res.status(missing.length === 0 ? 200 : 503).json(body);
}
