import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { NextResponse } from 'next/server';

/**
 * 인증/권한 가드 헬퍼
 *
 * @purpose API 라우트에서 로그인/권한 검증을 간단하게 수행
 * @context NextAuth 세션 + DB 조회로 이중 검증
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
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
        { message: '권한이 없습니다. 관리자 또는 기업심사관 역할이 필요합니다.' },
        { status: 403 }
      );
    }
  }
  return null;
}

/**
 * 로그인 필수
 *
 * @purpose 로그인한 사용자만 접근 가능
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
    role: (session.user as any).role || 'user',
  };

  console.log('[requireLogin] User authenticated:', {
    email: user.email,
    role: user.role,
  });

  return user;
}

/**
 * 역할 기반 권한 검증
 *
 * @param allowedRoles 허용된 역할 배열
 * @purpose 특정 역할만 접근 가능
 * @returns 사용자 정보 또는 403 에러
 */
export async function requireRole(allowedRoles: string[]): Promise<AuthUser> {
  const user = await requireLogin();

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
  return requireRole(['admin', 'super_admin', 'examiner']);
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
 * 퍼미션 기반 검증 (향후 확장용)
 *
 * @param permission 필요한 퍼미션 (예: 'policy:analysis:write')
 * @purpose 역할이 아닌 세밀한 퍼미션으로 검증
 * @returns 사용자 정보 또는 403 에러
 *
 * @todo Redis 캐싱 + DB 퍼미션 테이블 연동
 */
export async function requirePerm(permission: string): Promise<AuthUser> {
  const user = await requireLogin();

  // 현재는 역할 기반으로 매핑 (나중에 DB 조회로 변경)
  const rolePermissions: Record<string, string[]> = {
    super_admin: ['*'], // 모든 권한
    admin: [
      'policy:analysis:write',
      'policy:news:write',
      'user:role:update',
      'user:manage',
    ],
    examiner: ['policy:analysis:write', 'policy:news:write'],
    user: [],
  };

  const userPerms = rolePermissions[user.role] || [];
  const hasPermission =
    userPerms.includes('*') || userPerms.includes(permission);

  if (!hasPermission) {
    console.warn('[requirePerm] Permission denied:', {
      email: user.email,
      role: user.role,
      requiredPerm: permission,
      userPerms,
    });

    throw new Error('FORBIDDEN');
  }

  console.log('[requirePerm] Permission granted:', {
    email: user.email,
    permission,
  });

  return user;
}
