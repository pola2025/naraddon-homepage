import { redirect } from 'next/navigation';

/**
 * 구 라우트 → 통합 페이지 redirect
 *
 * @purpose 전문가 메뉴 일원화 (2026-04-28)
 * @context /admin/expert-services 는 Expert(서비스 카드) 모델 단독 관리 페이지였음.
 *          /admin/experts 통합 페이지에서 서비스 카드/프로필+회사정보/목록 모두 다루므로 흡수.
 * @note 기존 북마크/링크 호환을 위해 30일간 redirect 유지 → 이후 410 전환 검토.
 */
export default function LegacyExpertServicesAdminRedirect() {
  redirect('/admin/experts');
}
