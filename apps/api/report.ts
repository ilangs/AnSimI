import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// 실전 배포 시 OpenAI → Anthropic 교체 (analyze.ts와 동일)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const AVG_FRAUD_AMOUNT = 3_500_000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { familyId, period = 'week' } = req.query;

  if (!familyId || typeof familyId !== 'string') {
    return res.status(400).json({ error: 'familyId가 필요합니다' });
  }

  // 기간 계산
  const days = period === 'month' ? 30 : 7;
  const since = new Date();
  since.setDate(since.getDate() - days);

  // 가족 구성원 userId 조회
  const { data: members } = await supabase
    .from('family_members')
    .select('user_id')
    .eq('family_id', familyId);

  const userIds = (members ?? []).map((m: any) => m.user_id);

  if (userIds.length === 0) {
    return res.status(200).json({
      totalBlocked: 0,
      highRiskCount: 0,
      byDay: [],
      byType: [],
      savedAmount: 0,
      aiInsight: '아직 분석 데이터가 없어요. 안심이가 열심히 지키고 있어요!',
    });
  }

  // 분석된 메시지 조회
  const { data: messages } = await supabase
    .from('analyzed_messages')
    .select('*')
    .in('user_id', userIds)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true });

  const msgs = messages ?? [];

  const totalBlocked = msgs.filter((m) => m.is_blocked).length;
  const highRiskCount = msgs.filter((m) => m.risk_score >= 76).length;
  const savedAmount = totalBlocked * AVG_FRAUD_AMOUNT;

  // 일별 통계
  const byDayMap = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    byDayMap.set(d.toISOString().slice(0, 10), 0);
  }
  msgs
    .filter((m) => m.is_blocked)
    .forEach((m) => {
      const key = m.created_at.slice(0, 10);
      byDayMap.set(key, (byDayMap.get(key) ?? 0) + 1);
    });

  const byDay = Array.from(byDayMap.entries()).map(([date, count]) => ({ date, count }));

  // 타입별 통계
  const typeMap = { 안전: 0, 주의: 0, 위험: 0, 매우위험: 0 };
  msgs.forEach((m) => {
    typeMap[m.risk_level as keyof typeof typeMap]++;
  });
  const byType = Object.entries(typeMap).map(([type, count]) => ({ type, count }));

  // AI 인사이트 생성
  let aiInsight = '안심이가 열심히 부모님을 지키고 있어요!';
  try {
    const statsText = `총 ${msgs.length}건 분석, ${totalBlocked}건 차단, 고위험 ${highRiskCount}건, 절약 추정액 ${(savedAmount / 10000).toFixed(0)}만원`;
    const insightRes = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `다음 주간 보이스피싱 차단 통계를 보고, 가족을 위한 따뜻하고 안심되는 인사이트를 한 문장(40자 이내)으로 작성해주세요. 마크다운 없이 한 문장만:\n${statsText}`,
      }],
    });
    aiInsight = (insightRes.choices[0].message.content ?? aiInsight).slice(0, 80);
  } catch (err) {
    console.error('인사이트 생성 오류:', err);
  }

  return res.status(200).json({
    totalBlocked,
    highRiskCount,
    byDay,
    byType,
    savedAmount,
    aiInsight,
  });
}
