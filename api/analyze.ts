import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────
// AI 제공자: OpenAI (개발·테스트 단계)
// 실전 배포 시 아래 블록을 Anthropic으로 교체:
//   import Anthropic from '@anthropic-ai/sdk';
//   const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!,
//     defaultHeaders: { 'anthropic-beta': 'zero-data-retention-2024-10' } });
//
// OpenAI 데이터 정책: API 호출 데이터는 기본적으로 학습에 미사용 (2023년 정책)
// 개인정보처리방침 국외이전 항목: 실전 배포 전 Anthropic → OpenAI로 업데이트 필요
// ─────────────────────────────────────────────────────────────
const ai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 서버사이드 전용
);

const ANALYSIS_SYSTEM_PROMPT = `
당신은 대한민국 보이스피싱·스미싱 전문 분석 AI입니다.
사용자가 입력한 문자 메시지를 분석하여 반드시 아래 JSON 형식으로만 응답하세요.
마크다운, 설명, 서문 등 다른 텍스트는 절대 포함하지 마세요.

응답 JSON 형식:
{
  "score": 0~100 사이 정수 (위험도 점수),
  "level": "안전" | "주의" | "위험" | "매우위험",
  "reasons": ["판별 이유 1", "판별 이유 2", "판별 이유 3"],
  "keywords": ["의심 키워드1", "의심 키워드2"],
  "action": "대처 방법 한 문장 (30자 이내)"
}

위험도 기준:
- 0~25점 → 안전: 일반적인 정상 문자
- 26~50점 → 주의: 일부 의심 요소 있음, 주의 권고
- 51~75점 → 위험: 보이스피싱 가능성 높음, 무시 권고
- 76~100점 → 매우위험: 명백한 보이스피싱·스미싱, 즉시 차단 권고

점수 높이는 요소:
- 금융기관·정부기관·검찰·경찰·금감원 사칭
- "즉시", "오늘까지", "계좌 정지", "명의도용" 등 긴급성 조장
- 단축 URL, 비공식 링크 포함
- 개인정보·금융정보 요구
- 어색한 한국어, 문법 오류
- 발신번호 이상 (국제번호, 070 등)
- "사건조회", "특급보안", "자산이전", "보호관찰" 등 경찰 공개 위험 키워드
- 악성 앱 설치 유도

점수 낮추는 요소:
- 발신자가 저장된 연락처
- 일반 광고 문자 형식
- 정상적인 택배·배달 알림 형식
`.trim();

type RiskLevel = '안전' | '주의' | '위험' | '매우위험';
const VALID_LEVELS: RiskLevel[] = ['안전', '주의', '위험', '매우위험'];

function parseAnalysisResponse(raw: string) {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI 응답에서 JSON을 찾을 수 없습니다');

  const parsed = JSON.parse(jsonMatch[0]);

  const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score))));

  let level: RiskLevel;
  if (VALID_LEVELS.includes(parsed.level)) {
    level = parsed.level as RiskLevel;
  } else {
    if (score <= 25) level = '안전';
    else if (score <= 50) level = '주의';
    else if (score <= 75) level = '위험';
    else level = '매우위험';
  }

  return {
    score,
    level,
    reasons: Array.isArray(parsed.reasons)
      ? parsed.reasons.filter((r: unknown) => typeof r === 'string').slice(0, 5)
      : [],
    keywords: Array.isArray(parsed.keywords)
      ? parsed.keywords.filter((k: unknown) => typeof k === 'string').slice(0, 10)
      : [],
    action: typeof parsed.action === 'string' ? parsed.action.slice(0, 60) : '전문가에게 문의하세요',
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, userId, familyId } = req.body;

  if (!message || typeof message !== 'string' || !userId || !familyId) {
    return res.status(400).json({ error: '필수 파라미터가 누락되었습니다' });
  }

  if (message.length > 2000) {
    return res.status(400).json({ error: '문자 내용이 너무 깁니다' });
  }

  // Zero-Storage: 원문을 지역 변수에만 보관, API 호출 즉시 파기
  // 개인정보처리방침 제1부 원칙 1~3, 1.3항 기술 구현 요건 준수
  let smsContent: string | null = message;
  req.body.message = null; // 요청 객체에서 선제 제거

  let analysisResult;

  try {
    // 1. OpenAI gpt-4o-mini 호출 — 원문은 메모리 내에서만 처리
    try {
      const response = await ai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
          { role: 'user',   content: smsContent! },
        ],
      });

      // ✅ OpenAI API 호출 완료 즉시 원문 파기 (방침 1.3 ③~⑤단계)
      // 알림용 미리보기(40자)만 추출 후 원문 파기 — DB 미저장, 알림 페이로드에만 사용
      const messagePreview = smsContent
        ? smsContent.trim().slice(0, 40) + (smsContent.trim().length > 40 ? '...' : '')
        : '';
      smsContent = null;

      const rawText = response.choices[0].message.content ?? '';
      analysisResult = parseAnalysisResponse(rawText);
    } catch (err: unknown) {
      smsContent = null;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('OpenAI API 오류:', errMsg);
      return res.status(503).json({
        error: `분석 서버 오류: ${errMsg.slice(0, 120)}`,
      });
    }

    if (!analysisResult) {
      return res.status(503).json({ error: '분석 결과를 생성하지 못했습니다' });
    }

    // 2. Supabase에 '분석 결과만' 저장 — content는 반드시 null (원문 비저장)
    const { data: savedMessage, error: dbError } = await supabase
      .from('analyzed_messages')
      .insert({
        user_id: userId,
        content: null,          // ✅ 원문 저장 안 함
        risk_score: analysisResult.score,
        risk_level: analysisResult.level,
        reasons: analysisResult.reasons,
        keywords: analysisResult.keywords,
        action: analysisResult.action,
        is_blocked: analysisResult.score >= 51,
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB 저장 오류:', JSON.stringify(dbError));
    }
    // 3. 위험 감지 시 가족에게 Expo Push 알림 발송
    // - 부모가 분석 → 자녀에게 알림
    // - 자녀가 분석 → 부모에게 알림
    if (analysisResult.score >= 51) {
      const alertType = analysisResult.score >= 76 ? 'danger' : 'warning';

      const alertMsg = alertType === 'danger'
        ? {
            title: '🚨 위험한 문자가 도착했어요!',
            body: messagePreview
              ? `"${messagePreview}" — 즉시 확인해주세요!`
              : '보이스피싱 문자가 감지됐어요. 즉시 확인해주세요.',
          }
        : {
            title: '⚠️ 의심스러운 문자가 도착했어요',
            body: messagePreview
              ? `"${messagePreview}" — 주의가 필요해요.`
              : '주의가 필요한 문자가 감지됐어요.',
          };

      try {
        // 3-1. 분석한 사용자의 역할 조회 (부모/자녀에 따라 알림 대상 결정)
        const { data: senderData } = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .single();
        const senderRole = senderData?.role ?? 'parent';

        // 3-2. 가족 구성원 user_id 목록 조회
        const { data: memberRows } = await supabase
          .from('family_members')
          .select('user_id')
          .eq('family_id', familyId);

        const memberIds = (memberRows ?? [])
          .map((m: any) => m.user_id as string)
          .filter((id) => id && id !== userId); // 본인 제외

        let targetTokens: string[] = [];

        if (memberIds.length > 0) {
          // 3-3. 알림 대상: 부모가 분석 → 자녀, 자녀가 분석 → 부모
          const targetRole = senderRole === 'parent' ? 'child' : 'parent';

          const { data: targetUsers } = await supabase
            .from('users')
            .select('fcm_token')
            .in('id', memberIds)
            .eq('role', targetRole)
            .not('fcm_token', 'is', null);

          targetTokens = (targetUsers ?? [])
            .map((u: any) => u.fcm_token as string)
            .filter(Boolean);
        }

        if (targetTokens.length > 0) {
          const messages = targetTokens.map((token) => ({
            to: token,
            sound: 'default',
            title: alertMsg.title,
            body: alertMsg.body,
            data: { type: alertType, familyId, messageId: savedMessage?.id ?? '' },
            priority: 'high',
            channelId: 'ansimi-alerts',
            badge: 1,
          }));

          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(messages),
          });
        }

        // alerts 테이블 저장
        await supabase.from('alerts').insert({
          family_id: familyId,
          sender_id: userId,
          message_id: savedMessage?.id ?? null,
          type: alertType,
        });
      } catch (err) {
        console.error('알림 발송 오류:', err);
      }
    }

    return res.status(200).json({
      ...analysisResult,
      messageId: savedMessage?.id ?? null,
    });
  } finally {
    // ✅ finally 보장: 예외 경로 포함 원문 변수 이중 파기
    smsContent = null;
  }
}
