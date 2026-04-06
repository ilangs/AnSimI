import { AnalyzeRequest, AnalyzeResponse } from '@/types';

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

export async function analyzeMessage(
  req: AnalyzeRequest,
  retries = 2
): Promise<AnalyzeResponse> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });

      if (!res.ok) {
        throw new Error(`서버 오류: ${res.status}`);
      }

      const data = await res.json();
      return data as AnalyzeResponse;
    } catch (err) {
      if (attempt === retries) throw err;
      // 재시도 전 잠시 대기
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error('분석에 실패했습니다');
}
