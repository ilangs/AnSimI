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
} as const;

type AlertType = keyof typeof ALERT_MESSAGES;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { familyId, alertType, messageId, sosUserId } = req.body as {
    familyId: string;
    alertType: AlertType;
    messageId?: string;
    sosUserId?: string;
  };

  if (!familyId || !alertType) {
    return res.status(400).json({ error: '필수 파라미터가 누락되었습니다' });
  }
  if (!ALERT_MESSAGES[alertType]) {
    return res.status(400).json({ error: '유효하지 않은 alertType' });
  }

  // 1. 가족 구성원 조회 → 자녀 Expo 푸시 토큰 수집
  const { data: members, error: memberErr } = await supabase
    .from('family_members')
    .select('user_id, users(id, fcm_token, role)')
    .eq('family_id', familyId);

  if (memberErr) {
    console.error('가족 멤버 조회 오류:', memberErr);
    return res.status(500).json({ error: '가족 정보 조회 실패' });
  }

  const children = (members ?? [])
    .map((m: any) => m.users)
    .filter((u: any) => u?.role === 'child' && u?.fcm_token);

  const tokens: string[] = children.map((u: any) => u.fcm_token as string);

  // 2. alerts 테이블 저장
  const senderId = sosUserId ?? (members?.[0] as any)?.user_id;
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
  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default' as const,
    title: msg.title,
    body: msg.body,
    data: {
      type: alertType,
      familyId,
      messageId: messageId ?? '',
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
