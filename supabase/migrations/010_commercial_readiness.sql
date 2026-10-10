-- ============================================================
-- 010_commercial_readiness.sql
-- 상용화: auth.users → users, 가족 RPC, 동의 INSERT, alerts 타입, 구독 인덱스
-- ============================================================

-- ── 1. 신규 가입 시 public.users 행 생성 ─────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'child'),
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'name', ''), '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name  = COALESCE(EXCLUDED.name, users.name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 2. 가족 생성 RPC ─────────────────────────────────────────
-- 기존 수동/구버전 RPC가 RETURNS json/jsonb 등이면 CREATE OR REPLACE 불가(42P13)
DROP FUNCTION IF EXISTS public.create_family_with_member(text, text, uuid);
DROP FUNCTION IF EXISTS public.create_family_with_member(uuid, text, text);

CREATE OR REPLACE FUNCTION public.create_family_with_member(
  p_name TEXT,
  p_code TEXT,
  p_user_id UUID
) RETURNS families
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family families%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION '권한 없음'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM family_members WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION '이미 가족에 연결되어 있습니다'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO families (name, code)
  VALUES (COALESCE(NULLIF(p_name, ''), '우리 가족'), UPPER(p_code))
  RETURNING * INTO v_family;

  INSERT INTO family_members (family_id, user_id)
  VALUES (v_family.id, p_user_id);

  RETURN v_family;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_family_with_member(TEXT, TEXT, UUID) TO authenticated;

-- ── 3. 가족 코드 합류 RPC ────────────────────────────────────
DROP FUNCTION IF EXISTS public.join_family_by_code(text, uuid);

CREATE OR REPLACE FUNCTION public.join_family_by_code(
  p_code TEXT,
  p_user_id UUID
) RETURNS families
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family families%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION '권한 없음'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_family
  FROM families
  WHERE UPPER(code) = UPPER(TRIM(p_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION '유효하지 않은 코드입니다'
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO family_members (family_id, user_id)
  VALUES (v_family.id, p_user_id)
  ON CONFLICT (family_id, user_id) DO NOTHING;

  RETURN v_family;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_family_by_code(TEXT, UUID) TO authenticated;

-- ── 4. consent_logs: 클라이언트 INSERT ───────────────────────
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

-- ── 5. alerts.type — 링크 알림 타입 확장 ─────────────────────
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_type_check;
ALTER TABLE alerts ADD CONSTRAINT alerts_type_check
  CHECK (type IN (
    'danger', 'warning', 'sos', 'safe',
    'link_danger', 'link_high_danger', 'link_reported'
  ));

-- ── 6. subscriptions 갱신 Cron 조회용 ────────────────────────
CREATE INDEX IF NOT EXISTS idx_subscriptions_active_billing
  ON subscriptions (status, next_billing_at)
  WHERE status = 'active';
