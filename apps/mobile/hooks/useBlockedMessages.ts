// useBlockedMessages — 차단된 문자(blocked_messages) 조회/승인/신고
// status:
//   pending  → 자녀 검토 대기 (부모 폰에 이미지 표시, 링크 클릭 불가)
//   approved → 자녀 안전 확인 (원문 + 클릭 가능 링크 표시)
//   reported → 자녀 위험 신고 (원문 삭제, 영구 차단 표시)
//   expired  → 24시간 초과 (원문 삭제)

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';

export type BlockedStatus = 'pending' | 'approved' | 'reported' | 'expired';

export interface BlockedMessage {
  id: string;
  parent_user_id: string;
  family_id: string;
  risk_score: number;
  risk_level: '안전' | '주의' | '위험' | '매우위험';
  reasons: string[];
  keywords: string[];
  action: string | null;
  content_text: string | null;     // pending/approved 동안만 존재
  sender_number: string | null;
  message_preview: string;
  status: BlockedStatus;
  created_at: string;
  approved_at: string | null;
  reported_at: string | null;
  expires_at: string;
}

export interface UseBlockedMessagesReturn {
  blocked: BlockedMessage[];
  pendingCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
  approveMessage: (id: string) => Promise<void>;
  reportMessage: (id: string) => Promise<void>;
}

export function useBlockedMessages(): UseBlockedMessagesReturn {
  const { user, family } = useAuthStore();
  const [blocked, setBlocked] = useState<BlockedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!family?.id) {
      setBlocked([]);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('blocked_messages')
        .select('*')
        .eq('family_id', family.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('blocked_messages 조회 오류:', error);
        setBlocked([]);
        return;
      }
      setBlocked((data ?? []) as BlockedMessage[]);
    } finally {
      setIsLoading(false);
    }
  }, [family?.id]);

  // 초기 로드 + Realtime 구독
  useEffect(() => {
    refresh();
    if (!family?.id) return;

    const channelName = `blocked_msgs_${family.id}_${Math.random().toString(36).slice(2, 8)}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'blocked_messages' },
          () => { refresh().catch(() => {}); }
        )
        .subscribe();
    } catch (err) {
      console.warn('blocked_messages realtime 구독 실패:', err);
    }
    return () => {
      try { if (channel) supabase.removeChannel(channel); } catch {}
    };
  }, [family?.id, refresh]);

  const approveMessage = useCallback(
    async (id: string) => {
      // 낙관적 업데이트
      setBlocked((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: 'approved' as const, approved_at: new Date().toISOString() } : b))
      );

      const { error } = await supabase
        .from('blocked_messages')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) {
        console.error('approve 오류:', error);
        await refresh();
      }
    },
    [refresh]
  );

  const reportMessage = useCallback(
    async (id: string) => {
      // 낙관적 업데이트 — DB 트리거가 content_text 삭제 처리
      setBlocked((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, status: 'reported' as const, content_text: null, reported_at: new Date().toISOString() }
            : b
        )
      );

      const { error } = await supabase
        .from('blocked_messages')
        .update({ status: 'reported' })
        .eq('id', id);

      if (error) {
        console.error('report 오류:', error);
        await refresh();
      }
    },
    [refresh]
  );

  const pendingCount = blocked.filter((b) => b.status === 'pending').length;

  return {
    blocked,
    pendingCount,
    isLoading,
    refresh,
    approveMessage,
    reportMessage,
  };
}
