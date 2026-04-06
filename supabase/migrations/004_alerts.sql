-- 알림 테이블
CREATE TABLE IF NOT EXISTS alerts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    UUID REFERENCES families(id) ON DELETE CASCADE,
  sender_id    UUID REFERENCES users(id) ON DELETE SET NULL,   -- 부모님
  message_id   UUID REFERENCES analyzed_messages(id) ON DELETE SET NULL,
  type         TEXT NOT NULL CHECK (type IN ('danger', 'warning', 'sos', 'safe')),
  is_read      BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- RLS 활성화
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- 가족 구성원만 알림 접근
CREATE POLICY "alerts_family_members" ON alerts
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- 서비스 롤 전체 접근 (서버에서 알림 생성)
CREATE POLICY "alerts_service_role" ON alerts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_alerts_family_id ON alerts(family_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON alerts(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);

-- Realtime 활성화 (자녀 앱 실시간 수신용)
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
