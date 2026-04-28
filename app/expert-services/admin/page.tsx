import { redirect } from 'next/navigation';

/**
 * 구버전 비밀번호 게이트 페이지 → 통합 페이지 redirect
 *
 * @purpose 전문가 메뉴 일원화 (2026-04-28)
 * @context /expert-services/admin 은 별도 비밀번호(useAdminAuth + /api/expert-services/verify) 게이트
 *          기반 구버전. AdminLayout(NextAuth admin/super_admin)으로 통일하면서 폐기.
 * @note redirect 시 AdminLayout 로그인 플로우로 자동 진입.
 */
export default function LegacyExpertServicesAdminGateRedirect() {
  redirect('/admin/experts');
}
