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
  removeMember: (familyId: string, targetUserId: string) => Promise<void>;
  generateCode: () => string;
}

function generateSixDigitCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const useFamilyStore = create<FamilyStore>((set, get) => ({
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

  removeMember: async (familyId, targetUserId) => {
    // SECURITY DEFINER RPC로 RLS 우회 + 호출자 멤버십 검증
    const { error } = await supabase.rpc('remove_family_member', {
      p_family_id: familyId,
      p_target_user_id: targetUserId,
    });

    if (error) {
      throw new Error(error.message || '가족 구성원 제거에 실패했습니다');
    }

    // 로컬 상태에서 즉시 제거 (낙관적 업데이트)
    set({
      members: get().members.filter(
        (m) => !(m.family_id === familyId && m.user_id === targetUserId)
      ),
    });

    // 서버 상태와 동기화 (백그라운드)
    await get().loadFamily(familyId);
  },
}));
