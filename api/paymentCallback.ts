import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * 토스 빌링 인증 successUrl — 브라우저에서 앱 딥링크로 전달
 * GET /payment/callback?userId=&customerKey=&authKey= (authKey는 토스가 추가)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(req.query)) {
    if (typeof val === 'string') params.set(key, val);
    else if (Array.isArray(val) && typeof val[0] === 'string') params.set(key, val[0]);
  }

  const deepLink = `ansimi://payment/callback?${params.toString()}`;

  const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>안심이 결제</title></head>
<body style="font-family:sans-serif;text-align:center;padding:2rem;">
<p>결제 인증이 완료되었습니다. 앱으로 돌아가 주세요.</p>
<p><a href="${deepLink.replace(/"/g, '&quot;')}">앱에서 계속하기</a></p>
<script>window.location.href=${JSON.stringify(deepLink)};</script>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
}
