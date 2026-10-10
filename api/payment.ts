import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from './lib/auth';
import { getSupabaseAdmin } from './lib/supabaseAdmin';

const supabase = getSupabaseAdmin();

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY!;
const TOSS_API_BASE = 'https://api.tosspayments.com/v1';
const SUBSCRIPTION_AMOUNT = 2900;

function toBase64(str: string) {
  return Buffer.from(str + ':').toString('base64');
}

function isCronAuthorized(req: VercelRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.authorization === `Bearer ${secret}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const action = req.query.action as string;

  switch (action) {
    case 'confirm':
      return handleConfirm(req, res);
    case 'billing':
      if (!isCronAuthorized(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      return handleBilling(req, res);
    case 'cancel':
      return handleCancel(req, res);
    default:
      return res.status(400).json({ error: '유효하지 않은 action' });
  }
}

async function handleConfirm(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req);
  if ('error' in auth) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { authKey, customerKey, userId } = req.body as {
    authKey: string;
    customerKey: string;
    userId: string;
  };

  if (!authKey || !customerKey || !userId) {
    return res.status(400).json({ error: '필수 파라미터 누락' });
  }

  if (userId !== auth.userId) {
    return res.status(403).json({ error: '본인 구독만 처리할 수 있습니다' });
  }

  try {
    const billingRes = await fetch(`${TOSS_API_BASE}/billing/authorizations/confirm`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${toBase64(TOSS_SECRET_KEY)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ authKey, customerKey }),
    });

    const billing = (await billingRes.json()) as { billingKey?: string; message?: string };
    if (!billingRes.ok) {
      console.error('빌링키 발급 실패:', billing.message);
      return res.status(400).json({ error: billing.message ?? '결제 실패' });
    }

    const billingKey = billing.billingKey!;
    const orderId = `ansimi-${userId}-${Date.now()}`;

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
        taxFreeAmount: 0,
      }),
    });

    const payment = (await payRes.json()) as { paymentKey?: string; message?: string };
    if (!payRes.ok) {
      console.error('첫 결제 실패:', payment.message);
      return res.status(400).json({ error: payment.message ?? '결제 실패' });
    }

    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + 1);

    await supabase.from('users').update({ is_subscribed: true }).eq('id', userId);

    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    const subRow = {
      user_id: userId,
      billing_key: billingKey,
      customer_key: customerKey,
      payment_key: payment.paymentKey ?? null,
      status: 'active' as const,
      started_at: new Date().toISOString(),
      next_billing_at: nextBilling.toISOString(),
      cancelled_at: null,
    };

    if (existing?.id) {
      await supabase.from('subscriptions').update(subRow).eq('id', existing.id);
    } else {
      await supabase.from('subscriptions').insert(subRow);
    }

    return res.status(200).json({
      success: true,
      paymentKey: payment.paymentKey,
      orderId,
    });
  } catch (err: unknown) {
    console.error('결제 처리 오류:', err);
    return res.status(500).json({ error: '결제 처리 중 오류가 발생했습니다' });
  }
}

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

    const payment = (await payRes.json()) as { paymentKey?: string; message?: string };
    if (!payRes.ok) {
      await supabase.from('users').update({ is_subscribed: false }).eq('id', userId);
      await supabase
        .from('subscriptions')
        .update({ status: 'failed' })
        .eq('user_id', userId);
      return res.status(400).json({ error: payment.message ?? '갱신 결제 실패' });
    }

    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + 1);

    await supabase
      .from('subscriptions')
      .update({
        payment_key: payment.paymentKey ?? null,
        status: 'active',
        next_billing_at: nextBilling.toISOString(),
      })
      .eq('user_id', userId);

    await supabase.from('users').update({ is_subscribed: true }).eq('id', userId);

    return res.status(200).json({ success: true, paymentKey: payment.paymentKey });
  } catch (err: unknown) {
    console.error('갱신 결제 오류:', err);
    return res.status(500).json({ error: '갱신 결제 중 오류' });
  }
}

async function handleCancel(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req);
  if ('error' in auth) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { userId, paymentKey, cancelReason } = req.body as {
    userId: string;
    paymentKey?: string;
    cancelReason?: string;
  };

  if (!userId) {
    return res.status(400).json({ error: 'userId 누락' });
  }

  if (userId !== auth.userId) {
    return res.status(403).json({ error: '본인 구독만 해지할 수 있습니다' });
  }

  try {
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

    await supabase.from('users').update({ is_subscribed: false }).eq('id', userId);
    await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return res.status(200).json({ success: true });
  } catch (err: unknown) {
    console.error('구독 해지 오류:', err);
    return res.status(500).json({ error: '구독 해지 중 오류' });
  }
}
