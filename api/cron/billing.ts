import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY!;
const TOSS_API_BASE = 'https://api.tosspayments.com/v1';
const SUBSCRIPTION_AMOUNT = 2900;

// Base64 인코딩 (토스페이먼츠 인증)
function toBase64(str: string) {
  return Buffer.from(str + ':').toString('base64');
}

/**
 * 월별 구독 자동결제 갱신
 * Vercel Cron: 매월 1일 자정 UTC (한국시간 오전 9시)
 * - 활성 구독자 조회
 * - 각 사용자별 토스페이먼츠 결제 수행
 * - 실패 시 is_subscribed false 처리
 * - 결과 로깅
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel Cron 요청 검증
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('⚠️  Unauthorized cron request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🔄 Monthly billing renewal started at', new Date().toISOString());

  try {
    // 1. 활성 구독자 조회 (is_subscribed = true)
    const { data: subscribers, error: queryError } = await supabase
      .from('users')
      .select('id, payment_method_key, customer_key')
      .eq('is_subscribed', true)
      .not('payment_method_key', 'is', null)
      .not('customer_key', 'is', null);

    if (queryError) {
      console.error('❌ Failed to query subscribers:', queryError);
      return res.status(500).json({ error: 'Database query failed' });
    }

    if (!subscribers || subscribers.length === 0) {
      console.log('✅ No active subscribers to renew');
      return res.status(200).json({
        success: true,
        processed: 0,
        failed: 0,
        message: 'No active subscribers',
      });
    }

    console.log(`📊 Processing ${subscribers.length} active subscribers`);

    let processed = 0;
    let failed = 0;
    const failures: Array<{ userId: string; reason: string }> = [];

    // 2. 각 구독자별 결제 처리
    for (const subscriber of subscribers) {
      const { id: userId, payment_method_key: billingKey, customer_key: customerKey } = subscriber;

      if (!billingKey || !customerKey) {
        console.warn(`⚠️  Subscriber ${userId} missing payment keys`);
        failures.push({ userId, reason: 'Missing payment keys' });
        failed++;
        continue;
      }

      try {
        const orderId = `ansimi-renew-${userId}-${Date.now()}`;

        // 토스페이먼츠 자동결제 호출
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

        const paymentResult = await payRes.json();

        if (!payRes.ok) {
          // 결제 실패 → 구독 취소 처리
          console.error(`❌ Payment failed for ${userId}:`, paymentResult.message);

          await supabase
            .from('users')
            .update({ is_subscribed: false })
            .eq('id', userId);

          failures.push({ userId, reason: paymentResult.message ?? 'Payment failed' });
          failed++;
        } else {
          console.log(`✅ Payment successful for ${userId}, paymentKey: ${paymentResult.paymentKey}`);
          processed++;
        }
      } catch (err: any) {
        console.error(`💥 Error processing ${userId}:`, err.message);

        // 에러 시에도 구독 취소 (결제 수단 문제일 수 있음)
        await supabase
          .from('users')
          .update({ is_subscribed: false })
          .eq('id', userId);

        failures.push({ userId, reason: err.message });
        failed++;
      }
    }

    console.log(`\n📈 Billing Summary:`);
    console.log(`   Total: ${subscribers.length}`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Failed: ${failed}`);
    if (failures.length > 0) {
      console.log(`   Failures:`, failures);
    }

    return res.status(200).json({
      success: true,
      processed,
      failed,
      total: subscribers.length,
      failures: failures.length > 0 ? failures : undefined,
    });
  } catch (err: any) {
    console.error('💥 Cron job error:', err.message);
    return res.status(500).json({ error: 'Cron job failed', message: err.message });
  }
}
