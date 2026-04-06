// Android SMS 수신 감지 훅
// 실제 SMS 권한 획득 및 백그라운드 수신은 네이티브 모듈 필요
// (expo-sms는 발송 전용, 수신은 별도 native module 필요)
// MVP에서는 수동 입력 방식으로 대체

import { useCallback } from 'react';
import { useAnalyze } from './useAnalyze';

export function useSMS() {
  const { analyzeAsync, isLoading } = useAnalyze();

  // 문자 수동 입력 분석 (MVP 방식)
  const analyzeManual = useCallback(
    async (smsContent: string) => {
      if (!smsContent.trim()) return null;
      return analyzeAsync(smsContent);
    },
    [analyzeAsync]
  );

  return {
    analyzeManual,
    isAnalyzing: isLoading,
  };
}
