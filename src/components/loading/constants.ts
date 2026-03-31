/**
 * 로딩 & 모션 공유 상수
 *
 * @purpose Framer Motion 기반 스켈레톤 + ScrollReveal 공통 설정
 * @context KPEC 스타일 차용 — 콘텐츠 구조 반영 shimmer + 부드러운 등장
 */

// 나라똔 브랜드 컬러
export const BRAND = {
  green: '#059669',
  greenLight: '#10b981',
  greenFaint: 'rgba(5, 150, 105, 0.1)',
  greenGlow: 'rgba(5, 150, 105, 0.3)',
} as const;

// ScrollReveal / StaggerItem 공통 이징 (KPEC ease curve)
export const EASE_SMOOTH = [0.25, 0.1, 0.25, 1] as const;

// shimmer gradient (Tailwind에서도 참조)
export const SHIMMER_GRADIENT = 'linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)';
