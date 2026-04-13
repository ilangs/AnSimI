import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// SecureStore 2048바이트 제한 우회 — 청크 분할 저장
// Supabase 세션 토큰이 2048바이트를 초과하면 저장 실패하므로 분할 필요
const CHUNK_SIZE = 1900; // 여유 마진 포함

const ChunkedSecureStore = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      // 청크 개수 확인
      const countStr = await SecureStore.getItemAsync(`${key}__count`);
      if (!countStr) {
        // 단일 청크 (구버전 호환)
        return SecureStore.getItemAsync(key);
      }
      const count = parseInt(countStr, 10);
      const chunks: string[] = [];
      for (let i = 0; i < count; i++) {
        const chunk = await SecureStore.getItemAsync(`${key}__${i}`);
        if (chunk == null) return null;
        chunks.push(chunk);
      }
      return chunks.join('');
    } catch {
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (value.length <= CHUNK_SIZE) {
        // 단일 청크로 충분한 경우
        await SecureStore.setItemAsync(key, value);
        await SecureStore.deleteItemAsync(`${key}__count`).catch(() => {});
        return;
      }
      // 다중 청크 분할 저장
      const totalChunks = Math.ceil(value.length / CHUNK_SIZE);
      await SecureStore.setItemAsync(`${key}__count`, String(totalChunks));
      for (let i = 0; i < totalChunks; i++) {
        await SecureStore.setItemAsync(
          `${key}__${i}`,
          value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
        );
      }
    } catch (e) {
      console.error('SecureStore setItem 오류:', e);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      const countStr = await SecureStore.getItemAsync(`${key}__count`);
      if (countStr) {
        const count = parseInt(countStr, 10);
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(`${key}__${i}`).catch(() => {});
        }
        await SecureStore.deleteItemAsync(`${key}__count`).catch(() => {});
      }
      await SecureStore.deleteItemAsync(key).catch(() => {});
    } catch {
      // 삭제 실패는 무시
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ChunkedSecureStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
