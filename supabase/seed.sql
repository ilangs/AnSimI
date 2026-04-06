-- 개발 테스트용 시드 데이터
-- 실제 배포 전 삭제 필요

-- 테스트 가족 그룹
INSERT INTO families (id, name, code) VALUES
  ('00000000-0000-0000-0000-000000000001', '테스트 가족', 'TEST01')
ON CONFLICT DO NOTHING;
