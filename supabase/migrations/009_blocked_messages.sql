-- ─────────────────────────────────────────────────────────────
-- 위험 문자 차단함 (Blocked Messages)
--
-- 목적: 위험도 51점 이상 SMS를 부모 폰에서 즉시 가리고 자녀 승인 후 표시
-- Zero-Storage 예외: 자녀 검토 워크플로용 24시간 임시 저장 후 자동 삭제
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS blocked_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,

  -- 분석 결과 (analyzed_messages와 동일 구조)
  risk_score INT NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('안전', '주의', '위험', '매우위험')),
  reasons JSONB DEFAULT '[]'::jsonb,
  keywords JSONB DEFAULT '[]'::jsonb,
  action TEXT,

  -- 원문 (24시간 후 자동 삭제, 자녀 신고 시 즉시 삭제)
  content_text TEXT,

  -- 메타데이터
  sender_number TEXT,
  message_preview TEXT NOT NULL,

  -- 상태: pending(자녀 검토 대기) → approved(안전 확인) | reported(위험 확정) | expired(24h 초과)
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'reported', 'expired')),

  created_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  reported_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours')
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_blocked_messages_family_status
  ON blocked_messages(family_id, status);
CREATE INDEX IF NOT EXISTS idx_blocked_messages_expires_at
  ON blocked_messages(expires_at) WHERE content_text IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blocked_messages_parent_created
  ON blocked_messages(parent_user_id, created_at DESC);

-- RLS
ALTER TABLE blocked_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocked_messages_family_select" ON blocked_messages
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "blocked_messages_family_update" ON blocked_messages
  FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "blocked_messages_service_role" ON blocked_messages
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 자녀 승인/신고 시 자동 처리 트리거
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION clear_blocked_message_on_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- 위험 신고 시: 원문 즉시 삭제 (보관 무의미)
  IF NEW.status = 'reported' AND OLD.status != 'reported' THEN
    NEW.content_text := NULL;
    NEW.reported_at := now();
  END IF;

  -- 안전 확인 시: approved_at 기록 (원문은 24시간 후 자동 삭제)
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.approved_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blocked_message_decision ON blocked_messages;
CREATE TRIGGER trg_blocked_message_decision
  BEFORE UPDATE ON blocked_messages
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION clear_blocked_message_on_decision();

-- ─────────────────────────────────────────────────────────────
-- 만료 정리 함수 (cron 또는 수동 호출)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cleanup_expired_blocked_messages()
RETURNS TABLE(expired_count INT, deleted_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count INT;
  v_deleted_count INT;
BEGIN
  -- 24시간 초과 pending → expired 처리, 원문 삭제
  UPDATE blocked_messages
  SET status = 'expired', content_text = NULL
  WHERE status = 'pending' AND expires_at < now();
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  -- 7일 초과 완료 항목 완전 삭제
  DELETE FROM blocked_messages
  WHERE status != 'pending' AND created_at < now() - interval '7 days';
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN QUERY SELECT v_expired_count, v_deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_expired_blocked_messages() TO service_role;

COMMENT ON TABLE blocked_messages IS
  '위험 SMS 자녀 검토 워크플로. content_text는 24h 후 자동 삭제, 신고 시 즉시 삭제.';
