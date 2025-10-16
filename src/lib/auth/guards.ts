import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { NextResponse } from 'next/server';
import { loadEffectivePermissions } from '@/lib/rbac/permissions';

/**
 * RBAC 기반 인증/권한 가드
 *
 * @purpose DB 기반 역할/퍼미션 검증 + Redis 캐시
 * @context 역할 변경 즉시 반영, JWT 토큰 의존 최소화
 * @security 환경변수만 사용, 하드코딩 금지
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string; // 하위 호환성 유지 (deprecated)
}

/**
 * 인증 에러 핸들러
 *
 * @purpose catch 블록에서 인증 에러를 체크하고 적절한 Response 반환
 * @example
 * catch (error) {
 *   const authError = handleAuthError(error);
 *   if (authError) return authError;
 *   // ... 다른 에러 처리
 * }
 */
export function handleAuthError(error: unknown): NextResponse | null {
  if (error instanceof Error) {
    if (error.message === 'UNAUTHENTICATED') {
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { message: '권한이 없습니다.' },
        { status: 403 }
      );
    }
    if (error.message === 'ACCOUNT_NOT_LINKED') {
      return NextResponse.json(
        { message: '계정 연결이 필요합니다.' },
        { status: 428 } // 428 Precondition Required
      );
    }
  }
  return null;
}

/**
 * 로그인 필수
 *
 * @purpose 로그인한 사용자만 접근 가능 (권한 검증 없음)
 * @returns 사용자 정보 또는 401 에러
 */
export async function requireLogin(): Promise<AuthUser> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.email) {
    throw new Error('UNAUTHENTICATED');
  }

  const user: AuthUser = {
    id: (session.user as any).id || '',
    email: session.user.email,
    name: session.user.name || '',
    role: (session.user as any).role || 'user', // 하위 호환성
  };

  console.log('[requireLogin] User authenticated:', {
    email: user.email,
    userId: user.id,
  });

  return user;
}

/**
 * 계정 연결 필수 (온보딩 완료)
 *
 * @purpose 네이버 로그인 후 계정 연결 완료된 사용자만 접근
 * @returns 사용자 정보 또는 428 에러
 * @note 향후 linked 필드 추가 시 활성화
 */
export async function requireLinkedAccount(): Promise<AuthUser> {
  const user = await requireLogin();

  // TODO: users 컬렉션에 linked 필드 추가 후 활성화
  // const dbUser = await getUserFromDB(user.id);
  // if (!dbUser.linked) {
  //   throw new Error('ACCOUNT_NOT_LINKED');
  // }

  return user;
}

/**
 * 퍼미션 기반 권한 검증 (RBAC 핵심)
 *
 * @param permission 필요한 퍼미션 (예: 'policy:analysis:write')
 * @purpose DB 기반 퍼미션 검증 + Redis 캐시
 * @returns 사용자 정보 또는 403 에러
 */
export async function requirePerm(permission: string): Promise<AuthUser> {
  const user = await requireLogin();

  // DB에서 사용자 권한 로드 (Redis 캐시 포함)
  const permissions = await loadEffectivePermissions(user.id);

  // super_admin은 모든 권한 보유
  const isSuperAdmin = permissions.has('*');
  const hasPermission = isSuperAdmin || permissions.has(permission);

  if (!hasPermission) {
    console.warn('[requirePerm] Permission denied:', {
      email: user.email,
      userId: user.id,
      requiredPerm: permission,
      userPermsCount: permissions.size,
    });

    throw new Error('FORBIDDEN');
  }

  console.log('[requirePerm] Permission granted:', {
    email: user.email,
    permission,
  });

  return user;
}

/**
 * 역할 기반 권한 검증 (레거시 호환)
 *
 * @param allowedRoles 허용된 역할 배열
 * @purpose 기존 코드 호환성 유지
 * @returns 사용자 정보 또는 403 에러
 * @deprecated requirePerm() 사용 권장
 */
export async function requireRole(allowedRoles: string[]): Promise<AuthUser> {
  const user = await requireLogin();

  // 역할 기반 검증 (하위 호환성)
  if (!allowedRoles.includes(user.role)) {
    console.warn('[requireRole] Access denied:', {
      email: user.email,
      userRole: user.role,
      allowedRoles,
    });

    throw new Error('FORBIDDEN');
  }

  console.log('[requireRole] Access granted:', {
    email: user.email,
    role: user.role,
  });

  return user;
}

/**
 * 관리자/심사관 전용 (정책 게시판)
 *
 * @purpose 정책분석, 정책소식 등 관리자급 콘텐츠 작성
 * @returns 사용자 정보 또는 403 에러
 */
export async function requirePolicyWriter(): Promise<AuthUser> {
  return requirePerm('policy:analysis:write');
}

/**
 * 관리자 전용
 *
 * @purpose 관리 기능 접근
 * @returns 사용자 정보 또는 403 에러
 */
export async function requireAdmin(): Promise<AuthUser> {
  return requireRole(['admin', 'super_admin']);
}

/**
 * 최고 관리자 전용
 *
 * @purpose 역할 부여 등 민감한 기능
 * @returns 사용자 정보 또는 403 에러
 */
export async function requireSuperAdmin(): Promise<AuthUser> {
  return requireRole(['super_admin']);
}

/**
 * 퍼미션 체크 (Boolean 반환)
 *
 * @purpose throw 없이 권한 확인만
 * @param userId 사용자 ID
 * @param permission 퍼미션 코드
 * @returns boolean
 */
export async function checkPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  try {
    const permissions = await loadEffectivePermissions(userId);
    return permissions.has('*') || permissions.has(permission);
  } catch (error) {
    console.error('[checkPermission] Error:', error);
    return false;
  }
}
