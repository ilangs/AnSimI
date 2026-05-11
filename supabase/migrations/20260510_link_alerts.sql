-- link_alerts: 부모 폰에서 감지된 위험 링크 알림
-- Zero-Storage 원칙: URL 원문은 절대 저장하지 않음 (도메인 앞 10자만 hint)
-- 멱등성: 여러 번 실행해도 안전

CREATE TABLE IF NOT EXISTS public.link_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  parent_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('high', 'medium', 'low')),
  malicious_count INT NOT NULL DEFAULT 0,
  safe_browsing_hit BOOLEAN NOT NULL DEFAULT FALSE,
  domain_hint TEXT,
  message_preview TEXT,
  sender_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'reported'))
);

-- 길이 제약: 존재하지 않을 때만 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'domain_hint_len'
  ) THEN
    ALTER TABLE public.link_alerts
      ADD CONSTRAINT domain_hint_len
      CHECK (domain_hint IS NULL OR char_length(domain_hint) <= 10);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'message_preview_len'
  ) THEN
    ALTER TABLE public.link_alerts
      ADD CONSTRAINT message_preview_len
      CHECK (message_preview IS NULL OR char_length(message_preview) <= 40);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS link_alerts_parent_idx ON public.link_alerts(parent_user_id);
CREATE INDEX IF NOT EXISTS link_alerts_created_idx ON public.link_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS link_alerts_status_idx ON public.link_alerts(status);
CREATE INDEX IF NOT EXISTS link_alerts_family_idx ON public.link_alerts(family_id);

-- RLS
ALTER TABLE public.link_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "link_alerts insert by parent" ON public.link_alerts;
CREATE POLICY "link_alerts insert by parent"
  ON public.link_alerts FOR INSERT
  WITH CHECK (parent_user_id = auth.uid());

DROP POLICY IF EXISTS "link_alerts select by family" ON public.link_alerts;
CREATE POLICY "link_alerts select by family"
  ON public.link_alerts FOR SELECT
  USING (
    parent_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.family_members fm_self
      JOIN public.family_members fm_parent
        ON fm_self.family_id = fm_parent.family_id
      WHERE fm_self.user_id = auth.uid()
        AND fm_parent.user_id = link_alerts.parent_user_id
    )
  );

DROP POLICY IF EXISTS "link_alerts update by child" ON public.link_alerts;
CREATE POLICY "link_alerts update by child"
  ON public.link_alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_members fm_self
      JOIN public.family_members fm_parent
        ON fm_self.family_id = fm_parent.family_id
      JOIN public.users u
        ON u.id = fm_self.user_id
      WHERE fm_self.user_id = auth.uid()
        AND fm_parent.user_id = link_alerts.parent_user_id
        AND u.role = 'child'
    )
  );

-- Realtime publication 등록 (supabase_realtime publication에 테이블 추가)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'link_alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.link_alerts;
  END IF;
END $$;
