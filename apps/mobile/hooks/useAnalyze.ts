import { useMutation, useQueryClient } from '@tanstack/react-query';
import { analyzeMessage } from '@/services/analyze';
import { useAuthStore } from '@/stores/authStore';
import { AnalyzeResponse } from '@/types';

/**
 * 문자 보이스피싱 분석 훅
 * - Claude API → /api/analyze → Supabase 저장 → (위험 시) 자녀 알림
 * - 내부적으로 최대 2회 재시도 (services/analyze.ts)
 * - 에러 발생 시 error 상태 반환
 */
export function useAnalyze() {
  const { user, family } = useAuthStore();
  const queryClient = useQueryClient();

  const mutation = useMutation<AnalyzeResponse, Error, string>({
    mutationFn: (message: string) => {
      if (!user?.id) {
        throw new Error('로그인 후 이용할 수 있어요');
      }
      if (!family?.id) {
        throw new Error('가족 연결 후 이용할 수 있어요');
      }
      if (!message.trim()) {
        throw new Error('분석할 문자 내용을 입력해주세요');
      }
      return analyzeMessage({
        message: message.trim(),
        userId: user.id,
        familyId: family.id,
      });
    },
    onSuccess: (data) => {
      // 분석 완료 후 알림 목록 갱신
      queryClient.invalidateQueries({ queryKey: ['alerts', family?.id] });
    },
    onError: (err) => {
      console.error('분석 오류:', err.message);
    },
  });

  return {
    analyze: mutation.mutate,
    analyzeAsync: mutation.mutateAsync,
    result: mutation.data,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}
