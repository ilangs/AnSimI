-- 분석된 메시지 테이블
CREATE TABLE IF NOT EXISTS analyzed_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,          -- 분석한 문자 원문
  risk_score  INT NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level  TEXT NOT NULL CHECK (risk_level IN ('안전', '주의', '위험', '매우위험')),
  reasons     JSONB DEFAULT '[]',     -- AI 판별 이유 배열
  keywords    JSONB DEFAULT '[]',     -- 의심 키워드 배열
  action      TEXT,                   -- AI 권장 대처법
  is_blocked  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS 활성화
ALTER TABLE analyzed_messages ENABLE ROW LEVEL SECURITY;

-- 사용자 자신의 메시지만 접근
CREATE POLICY "messages_own" ON analyzed_messages
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 서비스 롤 전체 접근
CREATE POLICY "messages_service_role" ON analyzed_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON analyzed_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON analyzed_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_risk_score ON analyzed_messages(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_blocked ON analyzed_messages(is_blocked) WHERE is_blocked = true;
