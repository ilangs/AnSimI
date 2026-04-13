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
    // isInitialized를 false로 리셋 → AuthGate가 로드 완료 전까지 라우팅하지 않음
    // (signIn 후 재호출 시 user set → family null 상태에서 잘못 라우팅되는 버그 방지)
    set({ isLoading: true, isInitialized: false });
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

          // 가족 정보 로드 — SECURITY DEFINER RPC 대신 직접 2단계 조회
          const { data: memberRow } = await supabase
            .from('family_members')
            .select('family_id')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (memberRow?.family_id) {
            const { data: familyData } = await supabase
              .from('families')
              .select('*')
              .eq('id', memberRow.family_id)
              .maybeSingle();

            if (familyData) {
              set({ family: familyData as Family });
            }
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
    // isInitialized: true 유지 → AuthGate가 user=null을 감지해 로그인 화면으로 이동
    set({ user: null, family: null, isInitialized: true });
  },

  updateFcmToken: async (token) => {
    const { user } = get();
    if (!user) return;

    await supabase.from('users').update({ fcm_token: token }).eq('id', user.id);
    set({ user: { ...user, fcm_token: token } });
  },
}));
