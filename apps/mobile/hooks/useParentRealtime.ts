import { useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { useAlertStore } from '@/stores/alertStore';
import { useAuthStore } from '@/stores/authStore';
import { Alert } from '@/types';

/**
 * 부모님 앱 전용 Realtime 훅
 * - Supabase alerts 테이블을 실시간 구독
 * - 새 위험 알림이 INSERT되면 alertStore 자동 갱신
 */
export function useParentRealtime() {
  const { family } = useAuthStore();
  const { addAlert, loadAlerts } = useAlertStore();

  useEffect(() => {
    if (!family?.id) return;

    // 초기 데이터 로드
    loadAlerts(family.id);

    // Supabase Realtime 구독
    const channel = supabase
      .channel(`parent-realtime-${family.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `family_id=eq.${family.id}`,
        },
        async (payload) => {
          // 새 알림이 오면 메시지 정보 포함해서 로드
          const { data } = await supabase
            .from('alerts')
            .select('*, analyzed_messages(*), sender:users!sender_id(*)')
            .eq('id', payload.new.id)
            .single();

          if (data) addAlert(data as Alert);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [family?.id]);
}
