import { create } from 'zustand';
import { supabase } from '@/services/supabase';
import { User, UserRole, Family } from '@/types';

interface AuthStore {
  user: User | null;
  family: Family | null;
  isLoading: boolean;
  isInitialized: boolean;

  setUser: (user: User | null) => void;
  setFamily: (family: Family | null) => void;
  setLoading: (loading: boolean) => void;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: UserRole, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  updateFcmToken: (token: string) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  family: null,
  isLoading: false,
  isInitialized: false,

  setUser: (user) => set({ user }),
  setFamily: (family) => set({ family }),
  setLoading: (isLoading) => set({ isLoading }),

  initialize: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (userData) {
          set({ user: userData as User });

          // 가족 정보 로드
          const { data: memberData } = await supabase
            .from('family_members')
            .select('family_id, families(*)')
            .eq('user_id', session.user.id)
            .single();

          if (memberData?.families) {
            set({ family: memberData.families as unknown as Family });
          }
        }
      }
    } catch (err) {
      console.error('초기화 오류:', err);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await get().initialize();
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email, password, role, name) => {
    set({ isLoading: true });
    try {
      // role·name을 메타데이터로 전달 → DB 트리거(handle_new_user)가 users 테이블에 자동 생성
      // (RLS 우회: SECURITY DEFINER 트리거가 서버사이드에서 직접 insert)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role, name } },
      });
      if (error) throw error;
      if (!data.user) throw new Error('회원가입에 실패했습니다');

      // 트리거가 users 행을 생성할 시간 확보 후 초기화
      await new Promise((r) => setTimeout(r, 500));
      await get().initialize();
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, family: null });
  },

  updateFcmToken: async (token) => {
    const { user } = get();
    if (!user) return;

    await supabase.from('users').update({ fcm_token: token }).eq('id', user.id);
    set({ user: { ...user, fcm_token: token } });
  },
}));
