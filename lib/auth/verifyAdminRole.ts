import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import clientPromise from '@/lib/mongodb-client';
import { UserRole } from '@/types/user.types';

/**
 * 관리자 권한 검증 유틸리티
 *
 * @purpose 세션과 DB 모두에서 role을 검증하여 이중 안전장치 제공
 * @context JWT 토큰이 오래되어도 DB에서 최신 role 조회로 권한 확인
 * @returns { isAuthorized, user, error }
 */
export interface AdminVerificationResult {
  isAuthorized: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  error?: string;
  debugInfo?: {
    hasSession: boolean;
    sessionRole?: string;
    dbRole?: string;
    roleMatch?: boolean;
  };
}

export async function verifyAdminRole(
  allowedRoles: string[] = ['admin', 'super_admin', 'examiner']
): Promise<AdminVerificationResult> {
  try {
    // 1단계: NextAuth 세션 확인
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return {
        isAuthorized: false,
        error: '로그인이 필요합니다.',
        debugInfo: {
          hasSession: !!session
        }
      };
    }

    const sessionRole = (session.user as any)?.role;
    const userEmail = session.user.email;

    console.log('[verifyAdminRole] Session check:', {
      email: userEmail,
      sessionRole,
      sessionRoleType: typeof sessionRole
    });

    // 2단계: MongoDB에서 최신 role 직접 조회 (이중 검증)
    const client = await clientPromise;
    const db = client.db('naraddon');

    const dbUser = await db.collection('users').findOne(
      { email: userEmail },
      { projection: { _id: 1, email: 1, name: 1, role: 1 } }
    );

    if (!dbUser) {
      console.error('[verifyAdminRole] User not found in DB:', userEmail);
      return {
        isAuthorized: false,
        error: '사용자 정보를 찾을 수 없습니다.',
        debugInfo: {
          hasSession: true,
          sessionRole
        }
      };
    }

    const dbRole = dbUser.role || UserRole.USER;

    console.log('[verifyAdminRole] DB role check:', {
      email: userEmail,
      dbRole,
      dbRoleType: typeof dbRole,
      allowedRoles,
      isAllowed: allowedRoles.includes(dbRole)
    });

    // 3단계: 허용된 role인지 확인 (DB role 기준)
    const isAuthorized = allowedRoles.includes(dbRole);

    if (!isAuthorized) {
      console.warn('[verifyAdminRole] Access denied:', {
        email: userEmail,
        requiredRoles: allowedRoles,
        actualRole: dbRole
      });

      return {
        isAuthorized: false,
        error: `권한이 없습니다. ${allowedRoles.join(' 또는 ')} 역할이 필요합니다.`,
        debugInfo: {
          hasSession: true,
          sessionRole,
          dbRole,
          roleMatch: sessionRole === dbRole
        }
      };
    }

    // 성공
    console.log('[verifyAdminRole] Access granted:', {
      email: userEmail,
      role: dbRole
    });

    return {
      isAuthorized: true,
      user: {
        id: dbUser._id.toString(),
        email: dbUser.email,
        name: dbUser.name,
        role: dbRole
      },
      debugInfo: {
        hasSession: true,
        sessionRole,
        dbRole,
        roleMatch: sessionRole === dbRole
      }
    };
  } catch (error) {
    console.error('[verifyAdminRole] Fatal error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return {
      isAuthorized: false,
      error: '권한 확인 중 오류가 발생했습니다.'
    };
  }
}
