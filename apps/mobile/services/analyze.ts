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
        // 서버가 보낸 오류 메시지를 그대로 사용 (진단 목적)
        let serverMsg = `서버 오류: ${res.status}`;
        try {
          const errBody = await res.json();
          if (errBody?.error) serverMsg = errBody.error;
        } catch {}
        throw new Error(serverMsg);
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
