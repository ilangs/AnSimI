import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import {
  requireAuth,
  requireFamilyMember,
  requireFamilyConsentComplete,
  requireActiveSubscription,
} from './lib/auth';
import { getSupabaseAdmin } from './lib/supabaseAdmin';
import { checkAnalyzeRateLimit } from './lib/rateLimit';

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

const supabase = getSupabaseAdmin();

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

// URL 마스킹 정규식 — 푸시 알림 body 안전 처리용
const URL_REGEX_SERVER =
  /(https?:\/\/[^\s<>"]+|bit\.ly\/[^\s<>"]+|naver\.me\/[^\s<>"]+|han\.gl\/[^\s<>"]+|tinyurl\.com\/[^\s<>"]+|me2\.do\/[^\s<>"]+)/gi;

/**
 * 푸시 알림 body 안에 URL이 있으면 [🔒차단된 링크: 도메인...]로 치환
 * → 자녀/부모 알림창에서 실수로 URL 클릭하여 피해 입는 것 방지
 */
function maskUrlsInPreview(text: string): string {
  if (!text) return text;
  return text.replace(URL_REGEX_SERVER, (match) => {
    const cleaned = match.replace(/[.,!?)\]]+$/g, '');
    let hint = cleaned.slice(0, 12);
    try {
      const u = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`);
      hint = u.hostname.slice(0, 12);
    } catch {}
    return `[🔒링크차단:${hint}...]`;
  });
}

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

  const auth = await requireAuth(req);
  if ('error' in auth) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { message, userId, familyId, urls: rawUrls, source, senderNumber } = req.body as {
    message: string;
    userId: string;
    familyId: string;
    urls?: string[];
    source?: 'auto' | 'manual';      // 'auto' = NotificationListener, 'manual' = 사용자 입력
    senderNumber?: string;
  };

  if (!message || typeof message !== 'string' || !userId || !familyId) {
    return res.status(400).json({ error: '필수 파라미터가 누락되었습니다' });
  }

  if (userId !== auth.userId) {
    return res.status(403).json({ error: '요청 사용자 정보가 일치하지 않습니다' });
  }

  if (!(await requireFamilyMember(auth.userId, familyId))) {
    return res.status(403).json({ error: '가족 구성원만 분석할 수 있습니다' });
  }

  if (!(await requireFamilyConsentComplete(familyId))) {
    return res.status(403).json({
      error: '부모·자녀 동의가 완료된 후 분석을 사용할 수 있습니다',
    });
  }

  if (!(await requireActiveSubscription(auth.userId, familyId))) {
    return res.status(402).json({ error: '구독이 필요합니다' });
  }

  const rate = checkAnalyzeRateLimit(auth.userId, req);
  if (!rate.ok) {
    res.setHeader('Retry-After', String(rate.retryAfterSec ?? 60));
    return res.status(429).json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' });
  }

  // 메모리 내에서만 사용 (Zero-Storage)
  const urlsInput: string[] = Array.isArray(rawUrls)
    ? rawUrls.filter((u) => typeof u === 'string' && u.length > 0).slice(0, 10)
    : [];

  if (message.length > 2000) {
    return res.status(400).json({ error: '문자 내용이 너무 깁니다' });
  }

  // Zero-Storage: 원문을 지역 변수에만 보관, API 호출 즉시 파기
  // 개인정보처리방침 제1부 원칙 1~3, 1.3항 기술 구현 요건 준수
  let smsContent: string | null = message;
  req.body.message = null; // 요청 객체에서 선제 제거

  let analysisResult;

  try {
    // 알림용 미리보기(40자) — OpenAI 호출 전 추출, DB 미저장, 알림 페이로드에만 사용
    // ⚠️ URL은 [🔒링크차단:...] 으로 마스킹 (자녀가 실수 클릭 방지)
    const rawPreview = smsContent
      ? smsContent.trim().slice(0, 40) + (smsContent.trim().length > 40 ? '...' : '')
      : '';
    let messagePreview = maskUrlsInPreview(rawPreview);

    // 0. Google Safe Browsing 조회 (URL 있을 때만)
    let safeBrowsingHit = false;
    let maliciousCount = 0;
    if (urlsInput.length > 0) {
      try {
        const sbRes = await fetch(
          `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.GOOGLE_SAFE_BROWSING_API_KEY ?? ''}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client: { clientId: 'ansimi', clientVersion: '1.0.0' },
              threatInfo: {
                threatTypes: [
                  'MALWARE',
                  'SOCIAL_ENGINEERING',
                  'UNWANTED_SOFTWARE',
                  'POTENTIALLY_HARMFUL_APPLICATION',
                ],
                platformTypes: ['ANY_PLATFORM'],
                threatEntryTypes: ['URL'],
                threatEntries: urlsInput.map((u) => ({ url: u })),
              },
            }),
          }
        );
        if (sbRes.ok) {
          const sbJson = (await sbRes.json()) as { matches?: unknown[] };
          maliciousCount = Array.isArray(sbJson.matches) ? sbJson.matches.length : 0;
          safeBrowsingHit = maliciousCount > 0;
        }
      } catch (err) {
        console.error('Safe Browsing 오류:', err);
      }
    }

    // AI 프롬프트 보강용 컨텍스트
    const linkContext =
      urlsInput.length > 0
        ? `\n\n[추가 컨텍스트 - URL 분석 결과]\n포함된 URL 수: ${urlsInput.length}\nSafe Browsing 매칭(악성 URL): ${maliciousCount}건${
            safeBrowsingHit ? '\n→ 알려진 피싱 사이트 포함' : ''
          }`
        : '';

    // 1. OpenAI gpt-4o-mini 호출 — 원문은 메모리 내에서만 처리
    try {
      const userContent = (smsContent ?? '') + linkContext;
      const response = await ai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
          { role: 'user',   content: userContent },
        ],
      });

      // ✅ OpenAI API 호출 완료 즉시 원문 파기 (방침 1.3 ③~⑤단계)
      smsContent = null;

      const rawText = response.choices[0].message.content ?? '';
      analysisResult = parseAnalysisResponse(rawText);

      // Safe Browsing 매칭 시 위험도 강제 상향
      if (safeBrowsingHit) {
        if (analysisResult.score < 76) analysisResult.score = 90;
        analysisResult.level = '매우위험';
        if (!analysisResult.reasons.some((r: string) => r.includes('피싱 사이트'))) {
          analysisResult.reasons.unshift('알려진 피싱 사이트 포함 (Google Safe Browsing 매칭)');
        }
      }
    } catch (err: unknown) {
      smsContent = null;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('OpenAI API 오류:', errMsg);
      return res.status(503).json({
        error: '분석 서버가 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.',
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

    // 2-2. 자동 감지 + 위험도 51+ 시 차단함(blocked_messages) INSERT
    //      - 부모 폰의 NotificationListener에서 호출된 경우만 차단 워크플로 진입
    //      - 원문은 24시간 후 자동 삭제 (트리거 + cleanup_expired_blocked_messages)
    let blockedMessageId: string | null = null;
    if (source === 'auto' && analysisResult.score >= 51) {
      try {
        const { data: blocked, error: blockedErr } = await supabase
          .from('blocked_messages')
          .insert({
            parent_user_id: userId,
            family_id: familyId,
            risk_score: analysisResult.score,
            risk_level: analysisResult.level,
            reasons: analysisResult.reasons,
            keywords: analysisResult.keywords,
            action: analysisResult.action,
            content_text: message,    // 24h 후 자동 삭제
            sender_number: senderNumber ?? null,
            message_preview: messagePreview,
            status: 'pending',
          })
          .select('id')
          .single();
        if (blockedErr) {
          console.error('blocked_messages 저장 오류:', JSON.stringify(blockedErr));
        } else if (blocked) {
          blockedMessageId = blocked.id;
        }
      } catch (e) {
        console.error('blocked_messages insert 예외:', e);
      }
    }

    // 3. 위험 감지 시 알림 발송
    // - 부모가 분석 → 자녀에게 알림 (자녀가 부모 폰 상황 인지)
    // - 자녀가 분석 → 자녀 본인만 (부모님께 걱정 안 끼치기 위해 부모 알림 미발송)
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

        if (senderRole === 'parent' && memberIds.length > 0) {
          // 3-3. 부모가 분석한 경우에만 자녀에게 알림 발송
          // (자녀가 분석한 경우 부모에게 알림하지 않음 — 부모님께 걱정 끼치지 않기 위함)
          const { data: targetUsers } = await supabase
            .from('users')
            .select('fcm_token')
            .in('id', memberIds)
            .eq('role', 'child')
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
            body: alertMsg.body,           // ← messagePreview는 이미 maskUrlsInPreview 처리됨
            data: {
              type: alertType,
              familyId,
              messageId: savedMessage?.id ?? '',
              blockedMessageId: blockedMessageId ?? '',  // ← 알림 탭 시 검토 화면 직접 이동
            },
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
      blockedMessageId,             // Kotlin 측에서 차단 알림 표시 시 참조
      linkAnalysis: {
        urls: urlsInput,            // 메모리 응답용 — DB 미저장
        maliciousCount,
        safeBrowsingHit,
      },
    });
  } finally {
    // ✅ finally 보장: 예외 경로 포함 원문 변수 이중 파기
    smsContent = null;
  }
}
