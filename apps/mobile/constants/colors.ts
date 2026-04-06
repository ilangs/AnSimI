export const Colors = {
  // 브랜드 컬러
  brand: '#1D9E75',
  brandLight: '#E8F7F2',
  brandDark: '#116248',

  // 위험도 컬러
  safe: '#1D9E75',
  safeBg: '#E8F7F2',
  caution: '#EF9F27',
  cautionBg: '#FEF3C7',
  danger: '#E24B4A',
  dangerBg: '#FEE2E2',
  veryDanger: '#B91C1B',
  veryDangerBg: '#FEE2E2',

  // 기본 컬러
  white: '#FFFFFF',
  black: '#000000',
  background: '#F8FAFB',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // 텍스트 컬러
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  // 상태 컬러
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // 그림자
  shadowColor: '#000000',
} as const;

export type ColorKey = keyof typeof Colors;
