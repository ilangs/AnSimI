-- ============================================================
-- 007_consent_objections.sql
-- v2.0 법적 대비 5대 항목 구현
--   - consent_logs: 이중 동의 이력 (개인정보보호법 제22조 — 3년 보관)
--   - is_family_consent_complete(): 서비스 활성화 조건 검증 함수
--   - objections: 오판정 이의신청 (SLA 72H 이용약관 조항 대응)
--   - overdue_objections: 72H 초과 미처리 모니터링 뷰
-- Supabase SQL Editor에서 실행 (006 실행 후)
-- ============================================================

-- ── 1. consent_logs 테이블 ────────────────────────────────────
-- 개인정보보호법 제22조: 동의 이력 3년 보관 의무
-- 부모님 + 자녀 각각 동의 타임스탬프, IP, 기기정보 저장
CREATE TABLE IF NOT EXISTS consent_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  user_role    TEXT NOT NULL CHECK (user_role IN ('parent', 'child')),
  version      TEXT NOT NULL DEFAULT 'v2.0',
  -- 동의 항목별 체크 여부 (방침 제2부 2.1~2.2 항목)
  -- 부모님: {collect, ai_analysis, family_share, overseas}
  -- 자녀: {collect, overseas, terms, ai_limit, self_decision}
  items        JSONB NOT NULL,
  consented_at TIMESTAMPTZ DEFAULT now(),
  ip_address   INET,
  device_info  JSONB,
  -- 동의 철회 시 withdrawn_at 기록, NULL이면 유효한 동의
  withdrawn_at TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;

-- 본인 동의 이력만 조회
CREATE POLICY "consent_logs_own" ON consent_logs
  FOR SELECT USING (auth.uid() = user_id);

-- 서버사이드 전체 접근 (동의 저장 시 service_role 사용)
CREATE POLICY "consent_logs_service_role" ON consent_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_consent_logs_user_id ON consent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_logs_consented_at ON consent_logs(consented_at DESC);

-- ── 2. 서비스 활성화 조건 검증 함수 ──────────────────────────
-- 부모님 + 자녀 양측 모두 동의 완료 여부를 확인
-- 방침 제2부 2.1 ⑤단계: is_family_consent_complete() = TRUE 시 AI 분석 활성화
CREATE OR REPLACE FUNCTION is_family_consent_complete(fam_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT COUNT(DISTINCT u.role) = 2
  FROM consent_logs cl
  JOIN users u ON cl.user_id = u.id
  JOIN family_members fm ON fm.user_id = u.id
  WHERE fm.family_id = fam_id
    AND cl.withdrawn_at IS NULL;
$$;

-- ── 3. objections 테이블 ─────────────────────────────────────
-- 오판정 이의신청 접수 및 처리 이력
-- 방침 제4부: SLA 72H + 이의신청 이력 2년 보관
CREATE TABLE IF NOT EXISTS objections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id       UUID REFERENCES analyzed_messages(id) ON DELETE SET NULL,
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  -- false_positive: 정상 문자 → 위험 판별됨 (오탐)
  -- false_negative: 사기 문자 → 안전 판별됨 (미탐)
  -- other: 기타
  objection_type   TEXT NOT NULL
    CHECK (objection_type IN ('false_positive', 'false_negative', 'other')),
  description      TEXT,
  -- pending → reviewing → resolved | rejected
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewing', 'resolved', 'rejected')),
  submitted_at     TIMESTAMPTZ DEFAULT now(),
  resolved_at      TIMESTAMPTZ,
  resolver_note    TEXT,
  -- 원본 점수 및 수정 후 점수 기록 (이력 증빙)
  original_score   INT,
  revised_score    INT
);

ALTER TABLE objections ENABLE ROW LEVEL SECURITY;

-- 본인 이의신청만 조회
CREATE POLICY "objections_own" ON objections
  FOR SELECT USING (auth.uid() = user_id);

-- 본인이 직접 제출
CREATE POLICY "objections_insert_own" ON objections
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 서버사이드 전체 접근 (처리 및 상태 업데이트)
CREATE POLICY "objections_service_role" ON objections
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_objections_user_id ON objections(user_id);
CREATE INDEX IF NOT EXISTS idx_objections_status ON objections(status);
CREATE INDEX IF NOT EXISTS idx_objections_submitted_at ON objections(submitted_at DESC);

-- ── 4. 72H SLA 초과 모니터링 뷰 ─────────────────────────────
-- 매일 담당자가 확인하여 SLA 위반 방지
-- 이용약관 제○조 ② "72시간 이내 처리" 약속 이행 모니터링
CREATE OR REPLACE VIEW overdue_objections AS
SELECT
  o.*,
  u.name AS user_name,
  u.email AS user_email,
  now() - o.submitted_at AS elapsed
FROM objections o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'pending'
  AND o.submitted_at < now() - INTERVAL '72 hours';

-- ── 5. 동의 이력 3년 자동 삭제 (단, 철회된 경우는 철회 후 3년) ─
-- 방침 제3.1조 동의이력 보유기간: "철회 후 3년"
CREATE OR REPLACE FUNCTION delete_old_consent_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM consent_logs
  WHERE withdrawn_at IS NOT NULL
    AND withdrawn_at < NOW() - INTERVAL '3 years';
END;
$$;

-- ── 6. 검증 쿼리 ─────────────────────────────────────────────
/*
-- 동의 완료된 가족 확인 (TRUE여야 AI 분석 활성화 가능)
SELECT family_id, is_family_consent_complete(family_id)
FROM families
LIMIT 10;

-- 72H 초과 미처리 이의신청 확인 (0건이어야 SLA 준수)
SELECT * FROM overdue_objections;

-- 동의 이력 수 확인
SELECT user_role, COUNT(*) FROM consent_logs
WHERE withdrawn_at IS NULL GROUP BY user_role;
*/
