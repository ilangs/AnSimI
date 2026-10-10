import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../lib/supabaseAdmin';

const supabase = getSupabaseAdmin();

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY!;
const TOSS_API_BASE = 'https://api.tosspayments.com/v1';
const SUBSCRIPTION_AMOUNT = 2900;

function toBase64(str: string) {
  return Buffer.from(str + ':').toString('base64');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('Unauthorized cron request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('Monthly billing renewal started at', new Date().toISOString());

  try {
    const nowIso = new Date().toISOString();
    const { data: subs, error: queryError } = await supabase
      .from('subscriptions')
      .select('id, user_id, billing_key, customer_key')
      .eq('status', 'active')
      .not('billing_key', 'is', null)
      .not('customer_key', 'is', null)
      .lte('next_billing_at', nowIso);

    if (queryError) {
      console.error('Failed to query subscriptions:', queryError);
      return res.status(500).json({ error: 'Database query failed' });
    }

    if (!subs || subs.length === 0) {
      return res.status(200).json({
        success: true,
        processed: 0,
        failed: 0,
        message: 'No subscriptions due',
      });
    }

    let processed = 0;
    let failed = 0;
    const failures: Array<{ userId: string; reason: string }> = [];

    for (const sub of subs) {
      const userId = sub.user_id as string;
      const billingKey = sub.billing_key as string;
      const customerKey = sub.customer_key as string;

      try {
        const orderId = `ansimi-renew-${userId}-${Date.now()}`;
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

        const paymentResult = (await payRes.json()) as {
          paymentKey?: string;
          message?: string;
        };

        if (!payRes.ok) {
          await supabase.from('users').update({ is_subscribed: false }).eq('id', userId);
          await supabase
            .from('subscriptions')
            .update({ status: 'failed' })
            .eq('id', sub.id);
          failures.push({ userId, reason: paymentResult.message ?? 'Payment failed' });
          failed++;
          continue;
        }

        const nextBilling = new Date();
        nextBilling.setMonth(nextBilling.getMonth() + 1);

        await supabase
          .from('subscriptions')
          .update({
            payment_key: paymentResult.paymentKey ?? null,
            next_billing_at: nextBilling.toISOString(),
            status: 'active',
          })
          .eq('id', sub.id);

        await supabase.from('users').update({ is_subscribed: true }).eq('id', userId);
        processed++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        await supabase.from('users').update({ is_subscribed: false }).eq('id', userId);
        await supabase.from('subscriptions').update({ status: 'failed' }).eq('id', sub.id);
        failures.push({ userId, reason: msg });
        failed++;
      }
    }

    return res.status(200).json({
      success: true,
      processed,
      failed,
      total: subs.length,
      failures: failures.length > 0 ? failures : undefined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Cron job error:', msg);
    return res.status(500).json({ error: 'Cron job failed', message: msg });
  }
}
