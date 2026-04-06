import { create } from 'zustand';
import { supabase } from '@/services/supabase';
import { Alert, AlertType } from '@/types';

interface AlertStore {
  alerts: Alert[];
  unreadCount: number;
  isLoading: boolean;

  loadAlerts: (familyId: string) => Promise<void>;
  markAsRead: (alertId: string) => Promise<void>;
  markAllAsRead: (familyId: string) => Promise<void>;
  addAlert: (alert: Alert) => void;

  // Realtime 구독
  subscribeToFamily: (familyId: string) => () => void;
}

export const useAlertStore = create<AlertStore>((set, get) => ({
  alerts: [],
  unreadCount: 0,
  isLoading: false,

  loadAlerts: async (familyId) => {
    set({ isLoading: true });
    try {
      const { data } = await supabase
        .from('alerts')
        .select('*, analyzed_messages(*), sender:users!sender_id(*)')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })
        .limit(50);

      const alerts = (data ?? []) as Alert[];
      const unreadCount = alerts.filter((a) => !a.is_read).length;
      set({ alerts, unreadCount });
    } catch (err) {
      console.error('알림 로드 오류:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  markAsRead: async (alertId) => {
    await supabase.from('alerts').update({ is_read: true }).eq('id', alertId);

    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === alertId ? { ...a, is_read: true } : a
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllAsRead: async (familyId) => {
    await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('family_id', familyId)
      .eq('is_read', false);

    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, is_read: true })),
      unreadCount: 0,
    }));
  },

  addAlert: (alert) => {
    set((state) => ({
      alerts: [alert, ...state.alerts],
      unreadCount: state.unreadCount + 1,
    }));
  },

  subscribeToFamily: (familyId) => {
    const channel = supabase
      .channel(`family-alerts-${familyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          get().addAlert(payload.new as Alert);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
