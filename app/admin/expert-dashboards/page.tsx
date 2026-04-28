import { redirect } from 'next/navigation';

/**
 * 구 라우트 → 통합 페이지 redirect (목록·검색 탭으로)
 *
 * @purpose 전문가 메뉴 일원화 (2026-04-28)
 * @context /admin/expert-dashboards 의 "목록·검색" 기능은 통합 페이지의 list 탭으로 이전.
 * @note 기존 북마크/링크 호환을 위해 30일간 redirect 유지.
 */
export default function LegacyExpertDashboardsRedirect() {
  redirect('/admin/experts?tab=list');
}
