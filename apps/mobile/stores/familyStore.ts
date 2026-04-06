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
        .select('*, users(*)')
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

    const { data: family, error } = await supabase
      .from('families')
      .insert({ name, code })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('family_members').insert({
      family_id: family.id,
      user_id: userId,
    });

    set({ family: family as Family });
    return family as Family;
  },

  joinFamily: async (code, userId) => {
    const { data: family, error } = await supabase
      .from('families')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (error || !family) throw new Error('유효하지 않은 코드입니다');

    await supabase.from('family_members').insert({
      family_id: family.id,
      user_id: userId,
    });

    set({ family: family as Family });
    return family as Family;
  },
}));
