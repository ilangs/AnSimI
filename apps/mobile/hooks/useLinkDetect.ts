// useLinkDetect — 부모 폰에서 SMS 메시지 내 URL 자동 감지
// useAutoAnalyze에서 NLS 수신 시 호출하여 위험 링크 분석을 트리거

import { useCallback, useState } from 'react';
import { extractUrls } from '@/utils/linkUtils';
import { useAuthStore } from '@/stores/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export interface UseLinkDetectReturn {
  detectedUrls: string[];
  hasRiskyLink: boolean;
  triggerAnalysis: (message: string, urls: string[]) => Promise<AnalysisResponse | null>;
  detect: (message: string) => string[];
}

export interface AnalysisResponse {
  score: number;
  level: '안전' | '주의' | '위험' | '매우위험';
  reasons: string[];
  keywords: string[];
  action: string;
  messageId: string | null;
  linkAnalysis?: {
    urls: string[];
    maliciousCount: number;
    safeBrowsingHit: boolean;
  };
}

export function useLinkDetect(): UseLinkDetectReturn {
  const { user, family } = useAuthStore();
  const [detectedUrls, setDetectedUrls] = useState<string[]>([]);

  const detect = useCallback((message: string) => {
    const urls = extractUrls(message);
    setDetectedUrls(urls);
    return urls;
  }, []);

  const triggerAnalysis = useCallback(
    async (message: string, urls: string[]): Promise<AnalysisResponse | null> => {
      if (!user?.id || !family?.id || !API_URL) return null;
      try {
        const res = await fetch(`${API_URL}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            userId: user.id,
            familyId: family.id,
            urls,
          }),
        });
        if (!res.ok) return null;
        return (await res.json()) as AnalysisResponse;
      } catch (err) {
        console.error('useLinkDetect 분석 오류:', err);
        return null;
      }
    },
    [user?.id, family?.id]
  );

  return {
    detectedUrls,
    hasRiskyLink: detectedUrls.length > 0,
    triggerAnalysis,
    detect,
  };
}
