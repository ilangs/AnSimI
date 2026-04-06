import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY!;
const TOSS_API_BASE = 'https://api.tosspayments.com/v1';
const SUBSCRIPTION_AMOUNT = 3900;

// Base64 인코딩 (토스페이먼츠 인증)
function toBase64(str: string) {
  return Buffer.from(str + ':').toString('base64');
}

// ──────────────────────────────────────────
// POST /api/payment?action=confirm   결제 승인
// POST /api/payment?action=billing   자동결제 등록
// POST /api/payment?action=cancel    구독 해지
// ──────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const action = req.query.action as string;

  switch (action) {
    case 'confirm':
      return handleConfirm(req, res);
    case 'billing':
      return handleBilling(req, res);
    case 'cancel':
      return handleCancel(req, res);
    default:
      return res.status(400).json({ error: '유효하지 않은 action' });
  }
}

// ── 1. 결제 승인 (최초 카드 등록 + 첫 결제) ──
async function handleConfirm(req: VercelRequest, res: VercelResponse) {
  const { authKey, customerKey, userId } = req.body as {
    authKey: string;
    customerKey: string;
    userId: string;
  };

  if (!authKey || !customerKey || !userId) {
    return res.status(400).json({ error: '필수 파라미터 누락' });
  }

  try {
    // 토스페이먼츠 빌링키 발급
    const billingRes = await fetch(`${TOSS_API_BASE}/billing/authorizations/confirm`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${toBase64(TOSS_SECRET_KEY)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ authKey, customerKey }),
    });

    const billing = await billingRes.json();
    if (!billingRes.ok) {
      console.error('빌링키 발급 실패:', billing);
      return res.status(400).json({ error: billing.message ?? '결제 실패' });
    }

    const billingKey = billing.billingKey;
    const orderId = `ansimi-${userId}-${Date.now()}`;

    // 첫 결제 실행
    const payRes = await fetch(`${TOSS_API_BASE}/billing/${billingKey}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${toBase64(TOSS_SECRET_KEY)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerKey,
        amount: SUBSCRIPTION_AMOUNT,
        orderId,
        orderName: '안심이 자녀 플랜 (월 구독)',
        customerEmail: undefined,
        taxFreeAmount: 0,
      }),
    });

    const payment = await payRes.json();
    if (!payRes.ok) {
      console.error('첫 결제 실패:', payment);
      return res.status(400).json({ error: payment.message ?? '결제 실패' });
    }

    // Supabase 업데이트: 구독 상태, 빌링키, 커스터머키 저장
    await supabase.from('users').update({
      is_subscribed: true,
    }).eq('id', userId);

    // 구독 정보 별도 테이블 저장 (필요 시 subscriptions 테이블 추가)
    console.log(`구독 완료: userId=${userId}, paymentKey=${payment.paymentKey}`);

    return res.status(200).json({
      success: true,
      paymentKey: payment.paymentKey,
      orderId,
    });
  } catch (err: any) {
    console.error('결제 처리 오류:', err);
    return res.status(500).json({ error: '결제 처리 중 오류가 발생했습니다' });
  }
}

// ── 2. 자동결제 실행 (월별 갱신용, 서버 크론에서 호출) ──
async function handleBilling(req: VercelRequest, res: VercelResponse) {
  const { billingKey, customerKey, userId } = req.body as {
    billingKey: string;
    customerKey: string;
    userId: string;
  };

  if (!billingKey || !customerKey || !userId) {
    return res.status(400).json({ error: '필수 파라미터 누락' });
  }

  const orderId = `ansimi-renew-${userId}-${Date.now()}`;

  try {
    const payRes = await fetch(`${TOSS_API_BASE}/billing/${billingKey}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${toBase64(TOSS_SECRET_KEY)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerKey,
        amount: SUBSCRIPTION_AMOUNT,
        orderId,
        orderName: '안심이 자녀 플랜 (월 구독 갱신)',
        taxFreeAmount: 0,
      }),
    });

    const payment = await payRes.json();
    if (!payRes.ok) {
      // 결제 실패 → 구독 해지
      await supabase.from('users').update({ is_subscribed: false }).eq('id', userId);
      return res.status(400).json({ error: payment.message ?? '갱신 결제 실패' });
    }

    return res.status(200).json({ success: true, paymentKey: payment.paymentKey });
  } catch (err: any) {
    console.error('갱신 결제 오류:', err);
    return res.status(500).json({ error: '갱신 결제 중 오류' });
  }
}

// ── 3. 구독 해지 ──
async function handleCancel(req: VercelRequest, res: VercelResponse) {
  const { userId, paymentKey, cancelReason } = req.body as {
    userId: string;
    paymentKey?: string;
    cancelReason?: string;
  };

  if (!userId) {
    return res.status(400).json({ error: 'userId 누락' });
  }

  try {
    // 마지막 결제 취소 (선택)
    if (paymentKey) {
      await fetch(`${TOSS_API_BASE}/payments/${paymentKey}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${toBase64(TOSS_SECRET_KEY)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancelReason: cancelReason ?? '사용자 요청',
        }),
      });
    }

    // 구독 상태 해지
    await supabase
      .from('users')
      .update({ is_subscribed: false })
      .eq('id', userId);

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('구독 해지 오류:', err);
    return res.status(500).json({ error: '구독 해지 중 오류' });
  }
}
