/**
 * 토스페이먼츠 구독 결제 서비스
 *
 * 플로우:
 * 1. requestBillingAuth() → 토스페이먼츠 빌링 인증창 오픈
 * 2. 인증 완료 후 authKey + customerKey 반환
 * 3. confirmPayment() → /api/payment?action=confirm 호출 → 빌링키 발급 + 첫 결제
 * 4. 이후 매월 서버에서 자동결제 (/api/payment?action=billing)
 *
 * SDK 설치: npm install @tosspayments/tosspayments-sdk (또는 WebView 방식)
 */

import { Alert, Linking } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL!;
const TOSS_CLIENT_KEY = process.env.EXPO_PUBLIC_TOSS_CLIENT_KEY ?? 'test_ck_placeholder';

export const SUBSCRIPTION_PRICE = 3900;
export const SUBSCRIPTION_PLAN = '안심이 자녀 플랜';

export interface PaymentResult {
  success: boolean;
  paymentKey?: string;
  orderId?: string;
  error?: string;
}

/**
 * 구독 결제 시작
 * MVP: WebView 기반 토스페이먼츠 빌링 인증
 */
export async function startSubscription(userId: string, userEmail?: string): Promise<PaymentResult> {
  const customerKey = `ansimi-${userId}`;

  // 토스페이먼츠 빌링 인증 URL
  const billingAuthUrl =
    `https://api.tosspayments.com/v1/billing/authorizations/card` +
    `?customerKey=${encodeURIComponent(customerKey)}` +
    `&successUrl=${encodeURIComponent(`${API_URL}/payment/callback?userId=${userId}`)}` +
    `&failUrl=${encodeURIComponent(`${API_URL}/payment/fail`)}`;

  // 실제 구현: WebView 모달 또는 InAppBrowser로 오픈
  // 현재는 외부 브라우저로 리다이렉트 (MVP 대응)
  try {
    const canOpen = await Linking.canOpenURL(billingAuthUrl);
    if (canOpen) {
      await Linking.openURL(billingAuthUrl);
      return { success: true }; // 실제 결과는 콜백으로 수신
    }
    return { success: false, error: '브라우저를 열 수 없습니다' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 결제 승인 (authKey 수신 후 서버 호출)
 */
export async function confirmPayment(
  authKey: string,
  customerKey: string,
  userId: string
): Promise<PaymentResult> {
  try {
    const res = await fetch(`${API_URL}/payment?action=confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authKey, customerKey, userId }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error ?? '결제 승인 실패' };
    }

    return {
      success: true,
      paymentKey: data.paymentKey,
      orderId: data.orderId,
    };
  } catch (err: any) {
    return { success: false, error: '네트워크 오류가 발생했습니다' };
  }
}

/**
 * 구독 해지
 */
export async function cancelSubscription(
  userId: string,
  paymentKey?: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/payment?action=cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        paymentKey,
        cancelReason: '사용자 요청으로 구독 해지',
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
