-- 가족 그룹 테이블
CREATE TABLE IF NOT EXISTS families (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT DEFAULT '우리 가족',
  code       TEXT UNIQUE NOT NULL,   -- 6자리 연결 코드
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 가족 멤버 테이블
CREATE TABLE IF NOT EXISTS family_members (
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (family_id, user_id)
);

-- RLS 활성화
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- families: 가족 구성원만 접근
CREATE POLICY "families_members_only" ON families
  FOR SELECT
  USING (
    id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "families_insert_authenticated" ON families
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- family_members: 자신의 가족 데이터 접근
CREATE POLICY "family_members_own" ON family_members
  FOR SELECT
  USING (user_id = auth.uid() OR family_id IN (
    SELECT family_id FROM family_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "family_members_insert_authenticated" ON family_members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 서비스 롤 전체 접근
CREATE POLICY "families_service_role" ON families FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "family_members_service_role" ON family_members FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 가족 코드로 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_families_code ON families(code);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);
