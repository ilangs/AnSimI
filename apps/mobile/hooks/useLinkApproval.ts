// useLinkApproval — 자녀 폰에서 link_alerts status 변경 + 부모 폰 신고 알림
// approve: 자녀가 안전 판단 → expo-web-browser로 자녀 폰에서 직접 확인
// report:  자녀가 위험 확정 → 부모 폰 FCM 알림 + KISA 신고 페이지 안내

import { useCallback, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const KISA_REPORT_URL = 'https://www.boho.or.kr';

export interface LinkAlert {
  id: string;
  created_at: string;
  parent_user_id: string;
  family_id: string | null;
  risk_level: 'high' | 'medium' | 'low';
  malicious_count: number;
  safe_browsing_hit: boolean;
  domain_hint: string | null;
  message_preview: string | null;
  sender_number: string | null;
  status: 'pending' | 'approved' | 'reported';
}

export interface UseLinkApprovalReturn {
  alerts: LinkAlert[];
  pendingCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
  approveLink: (alertId: string, openUrl?: string) => Promise<void>;
  reportLink: (alertId: string) => Promise<void>;
  openKisaReport: () => Promise<void>;
}

export function useLinkApproval(): UseLinkApprovalReturn {
  const { family } = useAuthStore();
  const [alerts, setAlerts] = useState<LinkAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!family?.id) return;
    setIsLoading(true);
    try {
      // 2단계 쿼리: family의 parent user_id 조회 → link_alerts 조회
      const { data: parentMembers } = await supabase
        .from('family_members')
        .select('user_id')
        .eq('family_id', family.id);

      const memberIds = (parentMembers ?? []).map((m: any) => m.user_id as string);
      if (memberIds.length === 0) {
        setAlerts([]);
        return;
      }

      const { data: parentUsers } = await supabase
        .from('users')
        .select('id')
        .in('id', memberIds)
        .eq('role', 'parent');

      const parentIds = (parentUsers ?? []).map((u: any) => u.id as string);
      if (parentIds.length === 0) {
        setAlerts([]);
        return;
      }

      const { data: rows, error } = await supabase
        .from('link_alerts')
        .select('*')
        .in('parent_user_id', parentIds)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('link_alerts 조회 오류:', error);
        setAlerts([]);
        return;
      }
      // pending 우선 정렬
      const sorted = (rows ?? []).sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setAlerts(sorted as LinkAlert[]);
    } finally {
      setIsLoading(false);
    }
  }, [family?.id]);

  // 초기 로드 + Realtime 구독 (채널명 unique — 중복 구독 충돌 방지)
  useEffect(() => {
    refresh();
    if (!family?.id) return;
    const channelName = `link_alerts_${family.id}_${Math.random().toString(36).slice(2, 8)}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'link_alerts' },
          () => {
            refresh().catch(() => {});
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('link_alerts realtime 구독 실패:', err);
    }
    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {}
    };
  }, [family?.id, refresh]);

  const approveLink = useCallback(
    async (alertId: string, openUrl?: string) => {
      // 낙관적 업데이트
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: 'approved' } : a))
      );

      const { error } = await supabase
        .from('link_alerts')
        .update({ status: 'approved' })
        .eq('id', alertId);

      if (error) {
        console.error('approve 오류:', error);
        await refresh();
        return;
      }

      // 자녀 폰 인앱 브라우저로 URL 직접 확인 (옵션)
      if (openUrl) {
        try {
          await WebBrowser.openBrowserAsync(openUrl);
        } catch (err) {
          console.error('WebBrowser 오류:', err);
        }
      }
    },
    [refresh]
  );

  const reportLink = useCallback(
    async (alertId: string) => {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: 'reported' } : a))
      );

      const target = alerts.find((a) => a.id === alertId);

      const { error } = await supabase
        .from('link_alerts')
        .update({ status: 'reported' })
        .eq('id', alertId);

      if (error) {
        console.error('report 오류:', error);
        await refresh();
        return;
      }

      // 부모 폰에 FCM 신고 알림 전송 (자녀 → 부모 방향)
      if (target && family?.id && API_URL) {
        try {
          await fetch(`${API_URL}/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              familyId: family.id,
              alertType: 'link_reported',
              alertId,
              targetRole: 'parent',
              messagePreview: target.message_preview ?? '',
            }),
          });
        } catch (err) {
          console.error('신고 알림 전송 오류:', err);
        }
      }
    },
    [alerts, family?.id, refresh]
  );

  const openKisaReport = useCallback(async () => {
    try {
      await WebBrowser.openBrowserAsync(KISA_REPORT_URL);
    } catch (err) {
      console.error('KISA 페이지 오류:', err);
    }
  }, []);

  const pendingCount = alerts.filter((a) => a.status === 'pending').length;

  return {
    alerts,
    pendingCount,
    isLoading,
    refresh,
    approveLink,
    reportLink,
    openKisaReport,
  };
}
