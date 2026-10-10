-- 010에서 4~6절을 건너뛴 경우를 위한 idempotent 보완 + RPC 권한

-- consent_logs INSERT (클라이언트)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'consent_logs' AND policyname = 'consent_logs_insert_own'
  ) THEN
    CREATE POLICY "consent_logs_insert_own" ON consent_logs
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- alerts 링크 타입
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_type_check;
ALTER TABLE alerts ADD CONSTRAINT alerts_type_check
  CHECK (type IN (
    'danger', 'warning', 'sos', 'safe',
    'link_danger', 'link_high_danger', 'link_reported'
  ));

CREATE INDEX IF NOT EXISTS idx_subscriptions_active_billing
  ON subscriptions (status, next_billing_at)
  WHERE status = 'active';

-- 앱에서 가족 동의 완료 여부 조회
GRANT EXECUTE ON FUNCTION public.is_family_consent_complete(uuid) TO authenticated;
