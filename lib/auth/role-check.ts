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

// ============================================================
// 리소스별 접근 권한 체크 (본인 리소스만 접근 가능)
// ============================================================

/**
 * 확장된 사용자 인터페이스 (리소스 소유권 체크용)
 */
export interface UserWithIds extends RoleCheckUser {
  id?: string;             // 사용자 ID (users 컬렉션)
  examinerId?: string;     // 심사관 ID (expert-examiners 컬렉션)
  expertId?: string;       // 전문가 ID (experts 컬렉션)
}

/**
 * 심사관 대시보드 접근 권한 체크
 *
 * @param user 현재 로그인 사용자
 * @param targetExaminerId 접근하려는 심사관 대시보드 ID
 * @returns 접근 가능 여부
 *
 * 규칙:
 * - 관리자: 모든 심사관 대시보드 접근 가능
 * - 심사관: 본인 대시보드만 접근 가능
 * - 그 외: 접근 불가
 */
export function canAccessExaminerDashboard(
  user: UserWithIds | null | undefined,
  targetExaminerId: string
): boolean {
  if (!user) return false;

  // 관리자는 모든 대시보드 접근 가능
  if (isAdmin(user)) return true;

  // 심사관은 본인 대시보드만 접근 가능
  if (user.role === 'examiner') {
    // examinerId 또는 id로 비교
    return user.examinerId === targetExaminerId || user.id === targetExaminerId;
  }

  return false;
}

/**
 * 전문가 대시보드 접근 권한 체크
 *
 * @param user 현재 로그인 사용자
 * @param targetExpertId 접근하려는 전문가 대시보드 ID
 * @returns 접근 가능 여부
 *
 * 규칙:
 * - 관리자: 모든 전문가 대시보드 접근 가능
 * - 전문가: 본인 대시보드만 접근 가능
 * - 그 외: 접근 불가
 */
export function canAccessExpertDashboard(
  user: UserWithIds | null | undefined,
  targetExpertId: string
): boolean {
  if (!user) return false;

  // 관리자는 모든 대시보드 접근 가능
  if (isAdmin(user)) return true;

  // 전문가는 본인 대시보드만 접근 가능
  if (user.role === 'expert') {
    // expertId 또는 id로 비교
    return user.expertId === targetExpertId || user.id === targetExpertId;
  }

  return false;
}

/**
 * 상담 정보 인터페이스 (접근 권한 체크용)
 */
export interface ConsultationAccess {
  applicantId: string;          // 상담 신청자 ID (일반사용자)
  assignedExaminerId?: string;  // 배정된 심사관 ID (관리자가 배정)
  assignedExpertId?: string;    // 배정된 전문가 ID (관리자가 배정)
}

/**
 * 상담 내역 접근 권한 체크
 *
 * @param user 현재 로그인 사용자
 * @param consultation 상담 정보 (신청자 ID, 배정된 심사관/전문가 ID)
 * @returns 접근 가능 여부
 *
 * 상담 흐름:
 * 1. 일반사용자 → 무료심사 신청
 * 2. 관리자 → 접수 확인 → 심사관/전문가에게 배정
 * 3. 심사관/전문가 → 본인에게 배정된 건만 처리
 *
 * 규칙:
 * - 관리자: 모든 상담 접근 가능 (접수/배정 담당)
 * - 심사관: 본인에게 배정된 상담만 접근 가능
 * - 전문가: 본인에게 배정된 상담만 접근 가능
 * - 일반사용자: 본인이 신청한 상담만 접근 가능
 */
export function canAccessConsultation(
  user: UserWithIds | null | undefined,
  consultation: ConsultationAccess
): boolean {
  if (!user) return false;

  // 관리자는 모든 상담 접근 가능 (접수/배정 담당)
  if (isAdmin(user)) return true;

  // 심사관: 본인에게 배정된 상담만 접근 가능
  if (user.role === 'examiner' && consultation.assignedExaminerId) {
    return user.examinerId === consultation.assignedExaminerId ||
           user.id === consultation.assignedExaminerId;
  }

  // 전문가: 본인에게 배정된 상담만 접근 가능
  if (user.role === 'expert' && consultation.assignedExpertId) {
    return user.expertId === consultation.assignedExpertId ||
           user.id === consultation.assignedExpertId;
  }

  // 일반사용자: 본인이 신청한 상담만 접근 가능
  return user.id === consultation.applicantId;
}

/**
 * 리소스 소유권 체크 (범용)
 *
 * @param user 현재 로그인 사용자
 * @param resourceOwnerId 리소스 소유자 ID
 * @returns 접근 가능 여부
 *
 * 규칙:
 * - 관리자: 모든 리소스 접근 가능
 * - 그 외: 본인 리소스만 접근 가능
 */
export function canAccessResource(
  user: UserWithIds | null | undefined,
  resourceOwnerId: string
): boolean {
  if (!user) return false;

  // 관리자는 모든 리소스 접근 가능
  if (isAdmin(user)) return true;

  // 본인 리소스만 접근 가능
  return user.id === resourceOwnerId;
}

// ============================================================
// 역할별 접근 가능 기능 정의
// ============================================================

/**
 * 역할별 접근 가능 기능 매트릭스
 *
 * 상담 흐름:
 * - 일반사용자 → 무료심사 신청
 * - 관리자 → 접수/확인 → 심사관 또는 전문가에게 배정
 * - 심사관/전문가 → 본인에게 배정된 건만 처리
 *
 * 관리자(admin/isAdmin): 모든 기능 접근 가능 (상담 접수/배정 담당)
 * 기업심사관(examiner): 본인 대시보드, 정책 콘텐츠 작성, 배정받은 상담만
 * 전문가(expert): 본인 대시보드, 배정받은 상담만
 * 일반사용자(user): 게시글 조회, 무료심사 신청, 본인 신청 건 진행상황 확인
 */
export const ROLE_PERMISSIONS = {
  // 관리자 - 상담 접수/배정 총괄
  admin: {
    adminDashboard: true,
    allExaminerDashboards: true,
    allExpertDashboards: true,
    allConsultations: true,           // 모든 상담 접근 (접수/배정/관리)
    consultationAssignment: true,     // 심사관/전문가에게 상담 배정
    userManagement: true,
    contentManagement: true,
    roleAssignment: false,            // super_admin만
  },
  super_admin: {
    adminDashboard: true,
    allExaminerDashboards: true,
    allExpertDashboards: true,
    allConsultations: true,
    consultationAssignment: true,
    userManagement: true,
    contentManagement: true,
    roleAssignment: true,
  },
  // 기업심사관 - 상담 직접 접수 안함, 관리자가 배정
  examiner: {
    adminDashboard: false,
    ownExaminerDashboard: true,
    otherExaminerDashboards: false,
    contentWrite: true,               // 정책분석, 정책소식 작성
    assignedConsultations: true,      // 관리자가 배정한 상담만 접근
    directConsultationAccept: false,  // 직접 상담 접수 불가
  },
  // 전문가 - 상담 직접 접수 안함, 관리자가 배정
  expert: {
    adminDashboard: false,
    ownExpertDashboard: true,
    otherExpertDashboards: false,
    assignedConsultations: true,      // 관리자가 배정한 상담만 접근
    directConsultationAccept: false,  // 직접 상담 접수 불가
  },
  // 일반 사용자
  user: {
    adminDashboard: false,
    viewContent: true,
    submitConsultation: true,         // 무료심사 신청 가능
    ownConsultationHistory: true,     // 본인 신청 건 진행상황 확인
  },
} as const;
