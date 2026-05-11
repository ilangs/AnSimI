// URL 추출 + Google Safe Browsing 조회 유틸
// Zero-Storage 원칙: URL 원문은 메모리에서만 처리, DB 미저장
// Safe Browsing Lookup API v4는 URL을 직접 전송 (SHA prefix는 Update API에서 사용)

export interface SafeBrowsingResult {
  url: string;
  isMalicious: boolean;
  threatType?:
    | 'MALWARE'
    | 'SOCIAL_ENGINEERING'
    | 'UNWANTED_SOFTWARE'
    | 'POTENTIALLY_HARMFUL_APPLICATION';
}

const URL_REGEX =
  /(https?:\/\/[^\s<>"]+|bit\.ly\/[^\s<>"]+|naver\.me\/[^\s<>"]+|han\.gl\/[^\s<>"]+|tinyurl\.com\/[^\s<>"]+|me2\.do\/[^\s<>"]+)/gi;

/** SMS 텍스트에서 URL 추출 (http/https + 한국 단축 URL) */
export function extractUrls(text: string): string[] {
  if (!text) return [];
  const matches = text.match(URL_REGEX) ?? [];
  // 끝의 구두점 제거 + 중복 제거
  const cleaned = matches.map((u) => u.replace(/[.,!?)\]]+$/g, ''));
  return Array.from(new Set(cleaned));
}

/**
 * Google Safe Browsing Lookup API v4
 * - Lookup API는 URL을 직접 전송하나, 본 앱은 부모 폰 → Vercel API 경유로
 *   서버사이드에서 호출하여 사용자 단말 IP·SMS 원문은 외부 노출되지 않음.
 * - 클라이언트 직접 호출 시에도 URL만 전송하며 SMS 본문은 절대 전송하지 않음.
 */
export async function checkSafeBrowsing(
  urls: string[],
  apiKey?: string
): Promise<SafeBrowsingResult[]> {
  const key = apiKey ?? process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  if (!key || urls.length === 0) {
    return urls.map((url) => ({ url, isMalicious: false }));
  }

  const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`;
  const body = {
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
      threatEntries: urls.map((u) => ({ url: u })),
    },
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return urls.map((url) => ({ url, isMalicious: false }));
    }

    const json = (await res.json()) as {
      matches?: Array<{ threat: { url: string }; threatType: SafeBrowsingResult['threatType'] }>;
    };

    const matchMap = new Map<string, SafeBrowsingResult['threatType']>();
    (json.matches ?? []).forEach((m) => {
      matchMap.set(m.threat.url, m.threatType);
    });

    return urls.map((url) => {
      const threatType = matchMap.get(url);
      return threatType
        ? { url, isMalicious: true, threatType }
        : { url, isMalicious: false };
    });
  } catch (err) {
    console.error('Safe Browsing 조회 오류:', err);
    return urls.map((url) => ({ url, isMalicious: false }));
  }
}

/** 도메인 앞 10자만 추출 (DB 저장용 hint) */
export function extractDomainHint(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.slice(0, 10);
  } catch {
    return url.slice(0, 10);
  }
}
