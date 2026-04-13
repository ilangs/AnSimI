import { create } from 'zustand';
import { supabase } from '@/services/supabase';
import { Family, FamilyMember, User } from '@/types';

interface FamilyStore {
  family: Family | null;
  members: (FamilyMember & { user: User })[];
  isLoading: boolean;

  setFamily: (family: Family | null) => void;
  loadFamily: (familyId: string) => Promise<void>;
  createFamily: (userId: string, name?: string) => Promise<Family>;
  joinFamily: (code: string, userId: string) => Promise<Family>;
  generateCode: () => string;
}

function generateSixDigitCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const useFamilyStore = create<FamilyStore>((set) => ({
  family: null,
  members: [],
  isLoading: false,

  setFamily: (family) => set({ family }),

  generateCode: generateSixDigitCode,

  loadFamily: async (familyId) => {
    set({ isLoading: true });
    try {
      const { data: familyData } = await supabase
        .from('families')
        .select('*')
        .eq('id', familyId)
        .single();

      const { data: membersData } = await supabase
        .from('family_members')
        .select('*, user:users(*)')   // 'user:users(*)' → FamilyMember.user 필드에 매핑
        .eq('family_id', familyId);

      set({
        family: familyData as Family,
        members: (membersData ?? []) as (FamilyMember & { user: User })[],
      });
    } catch (err) {
      console.error('가족 로드 오류:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  createFamily: async (userId, name = '우리 가족') => {
    const code = generateSixDigitCode();

    // SECURITY DEFINER 함수로 RLS 우회 (families + family_members 동시 생성)
    const { data, error } = await supabase.rpc('create_family_with_member', {
      p_name: name,
      p_code: code,
      p_user_id: userId,
    });

    if (error) throw error;

    const family = data as Family;
    set({ family });
    return family;
  },

  joinFamily: async (code, userId) => {
    // SECURITY DEFINER 함수로 RLS 우회 (비구성원도 코드로 가족 조회 가능)
    const { data, error } = await supabase.rpc('join_family_by_code', {
      p_code: code.toUpperCase(),
      p_user_id: userId,
    });

    if (error) throw new Error(error.message || '유효하지 않은 코드입니다');

    const family = data as Family;
    set({ family });
    return family;
  },
}));
