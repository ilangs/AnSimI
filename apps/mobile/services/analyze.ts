import { AnalyzeRequest, AnalyzeResponse } from '@/types';

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

// 단일 fetch 타임아웃 (밀리초)
// OpenAI 콜드 스타트 + 분석 시간 고려하여 30초로 설정
const FETCH_TIMEOUT_MS = 30_000;

/**
 * AbortController 기반 fetch with timeout
 */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 4xx 응답 (잘못된 요청)은 재시도 무의미 → 즉시 throw
 * 5xx / 네트워크 오류만 재시도 (최대 1회)
 *
 * 변경 이력 (Phase 9):
 * - 무한 로딩 방지: fetch 자체에 15초 타임아웃 (AbortController)
 * - 재시도 횟수 2 → 1로 축소 (최대 대기 약 32초 → 30초 미만)
 * - 4xx는 재시도 안 함 (서버 거부는 재시도해도 동일)
 */
export async function analyzeMessage(
  req: AnalyzeRequest,
  retries = 1
): Promise<AnalyzeResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(
        `${API_URL}/analyze`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req),
        },
        FETCH_TIMEOUT_MS
      );

      if (!res.ok) {
        // 서버 응답 메시지 추출
        let serverMsg = `서버 오류 (${res.status})`;
        try {
          const errBody = await res.json();
          if (errBody?.error) serverMsg = errBody.error;
        } catch {}

        // 4xx (Bad Request 등)는 재시도 무의미 → 즉시 throw
        if (res.status >= 400 && res.status < 500) {
          throw new Error(serverMsg);
        }

        // 5xx → 재시도 대상
        lastError = new Error(serverMsg);
        throw lastError;
      }

      const data = await res.json();
      return data as AnalyzeResponse;
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // AbortError = 타임아웃
      if (err?.name === 'AbortError') {
        lastError = new Error(
          `분석 서버 응답 시간 초과 (${FETCH_TIMEOUT_MS / 1000}초). 네트워크를 확인해주세요.`
        );
      }

      // 4xx 에러는 재시도하지 않음 (위에서 throw된 메시지에 "서버 오류 (4xx)" 포함)
      if (lastError.message.includes('서버 오류 (4')) {
        throw lastError;
      }

      if (attempt === retries) {
        throw lastError;
      }
      // 재시도 전 짧은 대기
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  throw lastError ?? new Error('분석에 실패했습니다');
}
