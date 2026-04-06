-- ============================================================
-- 005_rls_verify.sql
-- RLS 정책 추가 강화 + 검증 쿼리
-- Supabase 대시보드 SQL Editor에서 실행
-- ============================================================

-- ── 1. subscriptions 테이블 추가 (결제 정보 저장) ────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  billing_key    TEXT,                        -- 토스페이먼츠 빌링키 (암호화 저장 권장)
  customer_key   TEXT,                        -- 토스페이먼츠 커스터머키
  payment_key    TEXT,                        -- 마지막 결제 키
  status         TEXT DEFAULT 'active'
                   CHECK (status IN ('active', 'cancelled', 'failed')),
  started_at     TIMESTAMPTZ DEFAULT now(),
  next_billing_at TIMESTAMPTZ,
  cancelled_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 본인 구독 정보만 조회
CREATE POLICY "subscriptions_own" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- 서버사이드 전체 접근
CREATE POLICY "subscriptions_service_role" ON subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ── 2. RLS 활성화 재확인 ─────────────────────────────────────
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE families           ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyzed_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts             ENABLE ROW LEVEL SECURITY;

-- ── 3. 누락 정책 보완 ────────────────────────────────────────

-- analyzed_messages: 같은 가족 자녀도 읽기 가능 (리포트용)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'analyzed_messages'
      AND policyname = 'messages_family_child_read'
  ) THEN
    CREATE POLICY "messages_family_child_read" ON analyzed_messages
      FOR SELECT
      USING (
        user_id = auth.uid()
        OR user_id IN (
          SELECT fm2.user_id
          FROM family_members fm1
          JOIN family_members fm2 ON fm1.family_id = fm2.family_id
          WHERE fm1.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- alerts: INSERT는 인증된 사용자 허용 (부모님 SOS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'alerts'
      AND policyname = 'alerts_insert_authenticated'
  ) THEN
    CREATE POLICY "alerts_insert_authenticated" ON alerts
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- alerts: UPDATE (읽음 처리) — 가족 구성원만
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'alerts'
      AND policyname = 'alerts_update_family'
  ) THEN
    CREATE POLICY "alerts_update_family" ON alerts
      FOR UPDATE
      USING (
        family_id IN (
          SELECT family_id FROM family_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ── 4. 검증 쿼리 (실행 후 결과 확인) ────────────────────────
/*
-- RLS가 활성화된 테이블 목록
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 각 테이블의 RLS 정책 목록
SELECT tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ANTHROPIC_API_KEY 같은 민감 변수가 DB에 저장됐는지 확인 (없어야 정상)
SELECT COUNT(*) FROM users WHERE fcm_token LIKE 'sk-ant-%';
*/
