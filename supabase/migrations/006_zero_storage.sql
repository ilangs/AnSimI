-- ============================================================
-- 006_zero_storage.sql
-- Zero-Storage 원칙 적용 — analyzed_messages.content 컬럼 수정
--
-- 개인정보처리방침 v1.0 제1부 원칙 3 및 1.3항 기술 구현 준수:
--   "저장되는 데이터는 위험도 점수, 위험 등급, 판별 이유, 타임스탬프이며
--    문자 원문은 포함되지 않습니다."
--
-- Supabase 대시보드 SQL Editor에서 실행 (005 실행 후)
-- ============================================================

-- ── 1. content 컬럼: NOT NULL → NULL 허용으로 변경 ────────────
ALTER TABLE analyzed_messages
  ALTER COLUMN content DROP NOT NULL,
  ALTER COLUMN content SET DEFAULT NULL;

-- ── 2. DB 레벨 강제 제약 추가 ────────────────────────────────
-- 이 제약으로 인해 실수로라도 원문이 저장되면 DB가 거부함
-- (코드 버그, 직접 쿼리 삽입 등 모든 경로 차단)
ALTER TABLE analyzed_messages
  ADD CONSTRAINT content_must_be_null
  CHECK (content IS NULL);

-- ── 3. 기존 데이터 원문 파기 (이미 저장된 경우 대비) ──────────
-- 이전 버전 코드가 실행된 경우 content에 원문이 있을 수 있음
UPDATE analyzed_messages
  SET content = NULL
  WHERE content IS NOT NULL;

-- ── 4. 데이터 보존 기간 자동 삭제 트리거 ─────────────────────
-- 개인정보처리방침 제3조: 마지막 분석일로부터 1년 후 자동 삭제
-- pg_cron 확장이 없는 환경을 위해 함수+트리거 방식으로 구현

-- 오래된 분석 결과 삭제 함수
CREATE OR REPLACE FUNCTION delete_old_analyzed_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM analyzed_messages
  WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$;

-- Supabase pg_cron 사용 가능한 경우 (Dashboard > Extensions에서 pg_cron 활성화 후 실행):
-- SELECT cron.schedule(
--   'delete-old-messages',   -- job name
--   '0 3 * * *',             -- 매일 새벽 3시 실행
--   'SELECT delete_old_analyzed_messages()'
-- );

-- ── 5. 검증 쿼리 (실행 후 모두 NULL인지 확인) ─────────────────
/*
-- content가 NULL이 아닌 행이 0건이어야 정상
SELECT COUNT(*) AS 원문_잔류_건수
FROM analyzed_messages
WHERE content IS NOT NULL;

-- 제약 조건이 등록됐는지 확인
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'analyzed_messages'::regclass
  AND conname = 'content_must_be_null';
*/
