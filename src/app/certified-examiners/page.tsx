'use client';

import CertifiedExaminersSection from '@/components/certified-examiners/CertifiedExaminersSection';

/**
 * 인증 기업심사관 페이지
 *
 * @purpose 나라똔 인증 기업심사관 목록 및 상세 정보 표시
 * @context MongoDB에서 실시간으로 심사관 데이터 로드
 * @decision 정적 콘텐츠 대신 동적 컴포넌트 사용으로 관리자 변경사항 즉시 반영
 */
export default function CertifiedExaminersPage() {
  return <CertifiedExaminersSection />;
}