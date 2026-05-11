// useOcrAnalysis — 자녀 폰에서 ML Kit on-device OCR 후 AI 재분석
// 외부 API 미사용 (Google Vision 등 금지) — @react-native-ml-kit/text-recognition

import { useCallback, useState } from 'react';
import * as FileSystem from 'expo-file-system';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { useAuthStore } from '@/stores/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export interface AnalysisResult {
  score: number;
  level: '안전' | '주의' | '위험' | '매우위험';
  reasons: string[];
  keywords: string[];
  action: string;
}

export interface UseOcrAnalysisReturn {
  isAnalyzing: boolean;
  ocrResult: string | null;
  reanalysisResult: AnalysisResult | null;
  analyzeImage: (base64Image: string) => Promise<string>;
  error: string | null;
  reset: () => void;
}

/**
 * base64 이미지를 임시 파일로 저장 → ML Kit이 file URI를 요구
 */
async function base64ToTempFile(base64: string): Promise<string> {
  const path = `${FileSystem.cacheDirectory}sms-ocr-${Date.now()}.png`;
  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return path;
}

export function useOcrAnalysis(): UseOcrAnalysisReturn {
  const { user, family } = useAuthStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [reanalysisResult, setReanalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setOcrResult(null);
    setReanalysisResult(null);
    setError(null);
  }, []);

  const analyzeImage = useCallback(
    async (base64Image: string): Promise<string> => {
      setIsAnalyzing(true);
      setError(null);
      let tempPath: string | null = null;

      try {
        // 1. base64 → 임시 파일 → ML Kit OCR (on-device)
        tempPath = await base64ToTempFile(base64Image);
        const result = await TextRecognition.recognize(tempPath);
        const extractedText = result.text ?? '';
        setOcrResult(extractedText);

        // 2. AI 재분석 요청 (텍스트만 — 이미지 외부 전송 없음)
        if (extractedText.trim().length > 0 && user?.id && family?.id && API_URL) {
          try {
            const res = await fetch(`${API_URL}/analyze`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: extractedText,
                userId: user.id,
                familyId: family.id,
              }),
            });
            if (res.ok) {
              const json = (await res.json()) as AnalysisResult;
              setReanalysisResult(json);
            }
          } catch (err) {
            console.error('재분석 API 오류:', err);
          }
        }

        return extractedText;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        return '';
      } finally {
        // 임시 파일 즉시 삭제 (Zero-Storage)
        if (tempPath) {
          try {
            await FileSystem.deleteAsync(tempPath, { idempotent: true });
          } catch {}
        }
        setIsAnalyzing(false);
      }
    },
    [user?.id, family?.id]
  );

  return {
    isAnalyzing,
    ocrResult,
    reanalysisResult,
    analyzeImage,
    error,
    reset,
  };
}
