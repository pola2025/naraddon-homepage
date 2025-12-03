/**
 * 역할 기반 권한 체크 - 단일 소스
 *
 * @purpose 모든 역할/권한 판단을 이 파일에서 통합 관리
 * @context 로그인 이후 권한 체크에만 사용 (네이버 로그인 로직 건드리지 않음)
 * @note 새로운 역할 추가 시 이 파일만 수정
 */

export type UserRole = 'super_admin' | 'admin' | 'examiner' | 'expert' | 'user';

export interface RoleCheckUser {
  role?: string;
  isAdmin?: boolean;
}

/**
 * 역할 계층 정의
 * 상위 역할은 하위 역할의 권한을 포함
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  admin: 80,
  examiner: 60,
  expert: 40,
  user: 20,
};

/**
 * 관리자 권한 판단
 *
 * @param user 사용자 객체 (세션, DB 등)
 * @returns 관리자이면 true
 *
 * 관리자 조건:
 * - isAdmin 플래그가 true
 * - role이 'admin' 또는 'super_admin'
 */
export function isAdmin(user: RoleCheckUser | null | undefined): boolean {
  if (!user) return false;

  // isAdmin 플래그가 명시적으로 true
  if (user.isAdmin === true) return true;

  // role이 admin 또는 super_admin
  return user.role === 'admin' || user.role === 'super_admin';
}

/**
 * 슈퍼 관리자 권한 판단
 *
 * @param user 사용자 객체
 * @returns 슈퍼 관리자이면 true
 *
 * 슈퍼 관리자만 가능한 기능:
 * - 역할 부여/해제
 * - 시스템 설정 변경
 */
export function isSuperAdmin(user: RoleCheckUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'super_admin';
}

/**
 * 심사관 권한 판단
 *
 * @param user 사용자 객체
 * @returns 심사관 이상이면 true
 *
 * 심사관이 가능한 기능:
 * - 정책분석 작성
 * - 정책소식 작성
 * - 심사관 대시보드 접근
 */
export function isExaminer(user: RoleCheckUser | null | undefined): boolean {
  if (!user) return false;

  // 관리자는 심사관 권한 포함
  if (isAdmin(user)) return true;

  return user.role === 'examiner';
}

/**
 * 전문가 권한 판단
 *
 * @param user 사용자 객체
 * @returns 전문가 이상이면 true
 *
 * 전문가가 가능한 기능:
 * - 전문가 대시보드 접근
 * - 상담 관리
 */
export function isExpert(user: RoleCheckUser | null | undefined): boolean {
  if (!user) return false;

  // 관리자는 전문가 권한 포함
  if (isAdmin(user)) return true;

  return user.role === 'expert';
}

/**
 * 콘텐츠 작성 권한 판단 (정책분석, 정책소식)
 *
 * @param user 사용자 객체
 * @returns 콘텐츠 작성 가능하면 true
 *
 * 작성 가능 역할:
 * - 관리자 (admin, super_admin, isAdmin)
 * - 심사관 (examiner)
 */
export function canWriteContent(user: RoleCheckUser | null | undefined): boolean {
  if (!user) return false;

  // 관리자 또는 심사관
  return isAdmin(user) || user.role === 'examiner';
}

/**
 * 특정 역할 이상인지 판단
 *
 * @param user 사용자 객체
 * @param requiredRole 필요한 최소 역할
 * @returns 해당 역할 이상이면 true
 */
export function hasRoleOrHigher(
  user: RoleCheckUser | null | undefined,
  requiredRole: UserRole
): boolean {
  if (!user) return false;

  // isAdmin이면 super_admin 제외 모든 역할 접근 가능
  if (user.isAdmin === true && requiredRole !== 'super_admin') return true;

  const userLevel = ROLE_HIERARCHY[user.role as UserRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole];

  return userLevel >= requiredLevel;
}

/**
 * 역할 라벨 반환 (UI 표시용)
 *
 * @param user 사용자 객체
 * @returns 한글 역할 라벨
 */
export function getRoleLabel(user: RoleCheckUser | null | undefined): string {
  if (!user) return '비회원';

  if (user.role === 'super_admin') return '최고관리자';
  if (isAdmin(user)) return '관리자';
  if (user.role === 'examiner') return '기업심사관';
  if (user.role === 'expert') return '전문가';
  return '일반회원';
}

/**
 * 역할 배지 색상 반환 (UI 표시용)
 *
 * @param user 사용자 객체
 * @returns Tailwind 색상 클래스
 */
export function getRoleBadgeColor(user: RoleCheckUser | null | undefined): string {
  if (!user) return 'bg-gray-100 text-gray-600';

  if (user.role === 'super_admin') return 'bg-purple-100 text-purple-700';
  if (isAdmin(user)) return 'bg-red-100 text-red-700';
  if (user.role === 'examiner') return 'bg-blue-100 text-blue-700';
  if (user.role === 'expert') return 'bg-green-100 text-green-700';
  return 'bg-gray-100 text-gray-600';
}
