-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('parent', 'child')),
  name          TEXT,
  phone         TEXT,
  fcm_token     TEXT,
  is_subscribed BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: 사용자는 자신의 데이터만 접근
CREATE POLICY "users_own" ON users
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 서비스 롤은 모든 데이터 접근 가능 (서버사이드 전용)
CREATE POLICY "service_role_all" ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
