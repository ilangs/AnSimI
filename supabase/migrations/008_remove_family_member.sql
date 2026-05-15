-- ─────────────────────────────────────────────────────────────
-- 가족 구성원 제거 RPC (SECURITY DEFINER로 RLS 우회 + 멤버십 검증)
--
-- 배경: 002_families.sql에 DELETE RLS 정책이 없어서 클라이언트에서
--       supabase.from('family_members').delete() 호출 시 조용히 거부됨
-- 해결: 동일한 가족 멤버만 다른 멤버를 제거 가능하도록 RPC 제공
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION remove_family_member(
  p_family_id UUID,
  p_target_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_is_member BOOLEAN;
  v_deleted_count INT;
BEGIN
  -- 1. 호출자(auth.uid)가 해당 가족의 멤버인지 확인
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE family_id = p_family_id
      AND user_id = auth.uid()
  ) INTO v_caller_is_member;

  IF NOT v_caller_is_member THEN
    RAISE EXCEPTION '권한 없음: 이 가족의 구성원이 아닙니다'
      USING ERRCODE = '42501';
  END IF;

  -- 2. 대상 멤버 삭제
  DELETE FROM family_members
  WHERE family_id = p_family_id
    AND user_id = p_target_user_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count = 0 THEN
    RAISE EXCEPTION '대상 구성원을 찾을 수 없습니다'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN TRUE;
END;
$$;

-- authenticated 사용자에게 실행 권한 부여
GRANT EXECUTE ON FUNCTION remove_family_member(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION remove_family_member IS
  '가족 구성원 제거. 호출자는 해당 가족의 멤버여야 함. SECURITY DEFINER로 RLS 우회.';
