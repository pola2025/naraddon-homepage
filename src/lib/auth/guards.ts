import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth-options';
import { NextResponse } from 'next/server';
import { loadEffectivePermissions } from '@/lib/rbac/permissions';
import { recordPermissionGranted, recordPermissionDenied } from '@/lib/rbac/monitoring';
import {
  isAdmin as checkIsAdmin,
  isSuperAdmin as checkIsSuperAdmin,
  isExaminer as checkIsExaminer,
  isExpert as checkIsExpert,
  canWriteContent,
} from '@/lib/auth/role-check';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

/**
 * RBAC 기반 인증/권한 가드
 *
 * @purpose DB 기반 역할/퍼미션 검증 + Redis 캐시
 * @context 역할 변경 즉시 반영, JWT 토큰 의존 최소화
 * @security 환경변수만 사용, 하드코딩 금지
 * @note 역할 판단은 role-check.ts 단일 소스 사용
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string; // 하위 호환성 유지 (deprecated)
  isAdmin?: boolean; // 관리자 권한 플래그 (role과 별도)
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
 * 로그인 필수 (DB에서 최신 권한 정보 로드)
 *
 * @purpose 로그인한 사용자만 접근 가능 (권한 검증 없음)
 * @returns 사용자 정보 또는 401 에러
 * @note JWT 토큰의 오래된 권한 정보 대신 DB에서 최신 정보 조회
 */
export async function requireLogin(): Promise<AuthUser> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.email) {
    throw new Error('UNAUTHENTICATED');
  }

  // 세션에서 기본 정보 가져오기
  const sessionUser = session.user as any;
  let user: AuthUser = {
    id: sessionUser.id || '',
    email: session.user.email,
    name: session.user.name || '',
    role: sessionUser.role || 'user',
    isAdmin: sessionUser.isAdmin || false,
  };

  // 🔥 DB에서 최신 role과 isAdmin 조회 (세션 값이 오래된 경우 대비)
  try {
    if (user.id) {
      const client = await clientPromise;
      const db = client.db('naraddon');
      const dbUser = await db.collection('users').findOne(
        { _id: new ObjectId(user.id) },
        { projection: { role: 1, isAdmin: 1 } }
      );

      if (dbUser) {
        // DB 값이 세션 값과 다르면 DB 값 사용 (최신 정보 우선)
        const dbRole = dbUser.role || 'user';
        const dbIsAdmin = dbUser.isAdmin === true;

        if (dbRole !== user.role || dbIsAdmin !== user.isAdmin) {
          console.log('[requireLogin] Updating user info from DB:', {
            email: user.email,
            sessionRole: user.role,
            dbRole,
            sessionIsAdmin: user.isAdmin,
            dbIsAdmin,
          });
          user.role = dbRole;
          user.isAdmin = dbIsAdmin;
        }
      }
    }
  } catch (error) {
    // DB 조회 실패해도 세션 값으로 계속 진행
    console.error('[requireLogin] DB lookup failed, using session values:', error);
  }

  console.log('[requireLogin] User authenticated:', {
    email: user.email,
    userId: user.id,
    role: user.role,
    isAdmin: user.isAdmin,
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

  // 관리자는 모든 권한 허용 (role-check.ts 사용)
  if (checkIsAdmin(user)) {
    console.log('[requirePerm] Permission granted (admin):', {
      email: user.email,
      permission,
    });
    return user;
  }

  // DB에서 사용자 권한 로드 (Redis 캐시 포함)
  const permissions = await loadEffectivePermissions(user.id);

  // super_admin은 모든 권한 보유
  const isSuperAdmin = permissions.has('*');
  const hasPermission = isSuperAdmin || permissions.has(permission);

  if (!hasPermission) {
    recordPermissionDenied(user.id, permission);
    console.warn('[requirePerm] Permission denied:', {
      email: user.email,
      userId: user.id,
      requiredPerm: permission,
      userPermsCount: permissions.size,
      isAdmin: user.isAdmin,
    });

    throw new Error('FORBIDDEN');
  }

  recordPermissionGranted(user.id, permission);
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
 * @note role-check.ts의 canWriteContent 사용 (일관된 권한 체계)
 */
export async function requirePolicyWriter(): Promise<AuthUser> {
  const user = await requireLogin();

  // 관리자(isAdmin/admin/super_admin) 또는 심사관(examiner)이면 허용
  if (canWriteContent(user)) {
    console.log('[requirePolicyWriter] Access granted:', {
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
    });
    return user;
  }

  console.warn('[requirePolicyWriter] Access denied:', {
    email: user.email,
    role: user.role,
    isAdmin: user.isAdmin,
  });
  throw new Error('FORBIDDEN');
}

/**
 * 관리자 전용
 *
 * @purpose 관리 기능 접근
 * @returns 사용자 정보 또는 403 에러
 * @note role-check.ts의 isAdmin() 사용
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireLogin();

  // role-check.ts의 통합 함수 사용
  if (checkIsAdmin(user)) {
    console.log('[requireAdmin] Access granted:', {
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
    });
    return user;
  }

  console.warn('[requireAdmin] Access denied:', {
    email: user.email,
    role: user.role,
    isAdmin: user.isAdmin,
  });
  throw new Error('FORBIDDEN');
}

/**
 * 최고 관리자 전용
 *
 * @purpose 역할 부여 등 민감한 기능
 * @returns 사용자 정보 또는 403 에러
 * @note role-check.ts의 isSuperAdmin() 사용
 */
export async function requireSuperAdmin(): Promise<AuthUser> {
  const user = await requireLogin();

  if (checkIsSuperAdmin(user)) {
    console.log('[requireSuperAdmin] Access granted:', { email: user.email });
    return user;
  }

  console.warn('[requireSuperAdmin] Access denied:', { email: user.email, role: user.role });
  throw new Error('FORBIDDEN');
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

/**
 * 심사관 전용
 *
 * @purpose 심사관 기능 접근 (정책분석 작성 등)
 * @returns 사용자 정보 또는 403 에러
 * @note role-check.ts의 isExaminer() 사용 (관리자도 포함)
 */
export async function requireExaminer(): Promise<AuthUser> {
  const user = await requireLogin();

  if (checkIsExaminer(user)) {
    console.log('[requireExaminer] Access granted:', { email: user.email, role: user.role });
    return user;
  }

  console.warn('[requireExaminer] Access denied:', { email: user.email, role: user.role });
  throw new Error('FORBIDDEN');
}

/**
 * 전문가 전용
 *
 * @purpose 전문가 기능 접근 (전문가 대시보드 등)
 * @returns 사용자 정보 또는 403 에러
 * @note role-check.ts의 isExpert() 사용 (관리자도 포함)
 */
export async function requireExpert(): Promise<AuthUser> {
  const user = await requireLogin();

  if (checkIsExpert(user)) {
    console.log('[requireExpert] Access granted:', { email: user.email, role: user.role });
    return user;
  }

  console.warn('[requireExpert] Access denied:', { email: user.email, role: user.role });
  throw new Error('FORBIDDEN');
}

/**
 * 콘텐츠 작성자 전용 (정책분석, 정책소식)
 *
 * @purpose 콘텐츠 작성 권한 체크
 * @returns 사용자 정보 또는 403 에러
 * @note 관리자 또는 심사관만 작성 가능
 */
export async function requireContentWriter(): Promise<AuthUser> {
  const user = await requireLogin();

  if (canWriteContent(user)) {
    console.log('[requireContentWriter] Access granted:', { email: user.email, role: user.role });
    return user;
  }

  console.warn('[requireContentWriter] Access denied:', { email: user.email, role: user.role });
  throw new Error('FORBIDDEN');
}

/**
 * 기업심사관 역할 체크 (Boolean 반환, 하위 호환성)
 *
 * @purpose 기업심사관인지 확인 (게시글 작성 제한용)
 * @param user 사용자 정보 (session.user)
 * @returns boolean - 기업심사관이면 true
 * @deprecated checkIsExaminer() 사용 권장
 */
export function isExaminer(user: any): boolean {
  return user?.role === 'examiner';
}
