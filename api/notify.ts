import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────
// 푸시 알림 발송: Expo Push API 사용
// - 모바일 앱에서 getExpoPushTokenAsync()로 발급한 ExponentPushToken과 호환
// - Expo가 내부적으로 Firebase FCM(Android) / APNs(iOS)로 라우팅
// - Firebase Admin SDK 불필요 → Vercel 환경변수 단순화
// ─────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const ALERT_MESSAGES = {
  danger: {
    title: '🚨 위험한 문자가 도착했어요!',
    body: '부모님 폰에 보이스피싱 문자가 왔어요. 즉시 확인해주세요.',
  },
  warning: {
    title: '⚠️ 의심스러운 문자가 도착했어요',
    body: '부모님 폰에 주의가 필요한 문자가 왔어요.',
  },
  sos: {
    title: '🆘 SOS! 부모님이 도움을 요청해요!',
    body: '지금 바로 부모님께 전화해주세요!',
  },
  safe: {
    title: '✅ 안전 확인',
    body: '부모님이 안전해요.',
  },
  link_danger: {
    title: '⚠️ 부모님 폰에 의심 링크',
    body: '주의가 필요한 링크가 감지됐어요.',
  },
  link_high_danger: {
    title: '🚨 부모님 폰에 위험 링크!',
    body: '위험한 링크가 감지됐어요. 즉시 확인해주세요.',
  },
  link_reported: {
    title: '⛔ 위험한 문자 확인됨',
    body: '자녀가 위험한 링크로 확인했어요. 절대 클릭하지 마세요!',
  },
} as const;

type AlertType = keyof typeof ALERT_MESSAGES;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    familyId,
    alertType,
    messageId,
    sosUserId,
    alertId,
    riskLevel,
    maliciousCount,
    safeBrowsingHit,
    messagePreview,
    imageData,
    targetRole,
  } = req.body as {
    familyId: string;
    alertType: AlertType;
    messageId?: string;
    sosUserId?: string;
    alertId?: string;
    riskLevel?: 'high' | 'medium' | 'low';
    maliciousCount?: number;
    safeBrowsingHit?: boolean;
    messagePreview?: string;
    imageData?: string;
    targetRole?: 'parent' | 'child';
  };

  if (!familyId || !alertType) {
    return res.status(400).json({ error: '필수 파라미터가 누락되었습니다' });
  }
  if (!ALERT_MESSAGES[alertType]) {
    return res.status(400).json({ error: '유효하지 않은 alertType' });
  }

  // 링크 알림 방향: 부모 폰 감지 → 자녀 폰 수신 (기본 child)
  // 신고 알림: 자녀 → 부모 (link_reported)
  const resolvedTargetRole: 'parent' | 'child' =
    targetRole ?? (alertType === 'link_reported' ? 'parent' : 'child');

  // 1-1. 가족 구성원 user_id 목록 조회
  const { data: memberRows, error: memberErr } = await supabase
    .from('family_members')
    .select('user_id')
    .eq('family_id', familyId);

  if (memberErr) {
    console.error('가족 멤버 조회 오류:', memberErr);
    return res.status(500).json({ error: '가족 정보 조회 실패' });
  }

  const memberIds = (memberRows ?? []).map((m: any) => m.user_id as string).filter(Boolean);

  // 1-2. 대상 역할(부모/자녀) + fcm_token 보유한 사용자만 조회
  let children: { id: string; fcm_token: string }[] = [];
  if (memberIds.length > 0) {
    const { data: targetUsers } = await supabase
      .from('users')
      .select('id, fcm_token')
      .in('id', memberIds)
      .eq('role', resolvedTargetRole)
      .not('fcm_token', 'is', null);
    children = (targetUsers ?? []) as { id: string; fcm_token: string }[];
  }

  const tokens: string[] = children.map((u) => u.fcm_token).filter(Boolean);

  // 2. alerts 테이블 저장
  const senderId = sosUserId ?? (memberRows?.[0] as any)?.user_id;
  if (senderId) {
    const { error: alertErr } = await supabase.from('alerts').insert({
      family_id: familyId,
      sender_id: senderId,
      message_id: messageId ?? null,
      type: alertType,
    });
    if (alertErr) console.error('alerts 저장 오류:', alertErr);
  }

  if (tokens.length === 0) {
    return res.status(200).json({ sent: 0, skipped: 'no_child_tokens' });
  }

  // 3. Expo Push API로 발송
  const msg = ALERT_MESSAGES[alertType];
  // 링크 알림 본문에 messagePreview 반영
  const dynamicBody =
    (alertType === 'link_danger' || alertType === 'link_high_danger') && messagePreview
      ? `"${messagePreview.slice(0, 40)}"`
      : msg.body;

  // 이미지 base64는 Expo Push payload 크기 제한(약 4KB)을 초과할 수 있음
  // → data 페이로드에는 alertId만 넣고, 이미지는 자녀 앱이 Supabase에서 별도 fetch
  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default' as const,
    title: msg.title,
    body: dynamicBody,
    data: {
      type: alertType,
      familyId,
      messageId: messageId ?? '',
      alertId: alertId ?? '',
      riskLevel: riskLevel ?? '',
      maliciousCount: maliciousCount ?? 0,
      safeBrowsingHit: safeBrowsingHit ?? false,
      // imageData는 크기 문제로 페이로드에서 제외 — 자녀 앱이 alertId로 별도 조회
      hasImage: Boolean(imageData),
    },
    priority: 'high' as const,
    channelId: 'ansimi-alerts',
    badge: 1,
  }));

  try {
    const pushRes = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const pushData = await pushRes.json();

    // 4. 만료·무효 토큰 자동 정리
    const expiredUserIds: string[] = [];
    if (Array.isArray(pushData.data)) {
      pushData.data.forEach((ticket: any, i: number) => {
        if (ticket.status === 'error') {
          const errDetails = ticket.details?.error ?? '';
          if (
            errDetails === 'DeviceNotRegistered' ||
            errDetails === 'InvalidCredentials'
          ) {
            const userId = children[i]?.id;
            if (userId) expiredUserIds.push(userId);
          }
          console.error(`Expo Push 발송 실패 [${i}]:`, ticket.message);
        }
      });
    }

    if (expiredUserIds.length > 0) {
      await supabase
        .from('users')
        .update({ fcm_token: null })
        .in('id', expiredUserIds);
      console.log(`만료 토큰 ${expiredUserIds.length}개 정리 완료`);
    }

    const successCount = Array.isArray(pushData.data)
      ? pushData.data.filter((t: any) => t.status === 'ok').length
      : 0;

    return res.status(200).json({
      sent: successCount,
      failed: tokens.length - successCount,
      cleaned: expiredUserIds.length,
    });
  } catch (err: any) {
    console.error('Expo Push 발송 오류:', err);
    return res.status(500).json({ error: '알림 발송에 실패했습니다' });
  }
}
