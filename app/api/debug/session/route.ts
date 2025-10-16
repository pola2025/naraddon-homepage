import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

/**
 * 세션 디버깅 API
 *
 * @purpose 프로덕션에서 실제 세션 데이터 확인
 * @endpoint GET /api/debug/session
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({
        error: 'No session found',
        message: '로그인되지 않았습니다.'
      }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      session: {
        user: {
          email: session.user?.email,
          name: session.user?.name,
          role: userRole,
          roleType: typeof userRole,
          id: (session.user as any)?.id,
          mobile: (session.user as any)?.mobile,
          provider: (session.user as any)?.provider,
        }
      },
      permissionCheck: {
        userRole,
        isAdmin: userRole === 'admin',
        isSuperAdmin: userRole === 'super_admin',
        isExaminer: userRole === 'examiner',
        hasPermission: (
          userRole === 'admin' ||
          userRole === 'super_admin' ||
          userRole === 'examiner'
        )
      },
      rawComparison: {
        'userRole === "admin"': userRole === 'admin',
        'userRole !== "admin"': userRole !== 'admin',
        'String(userRole)': String(userRole),
        'JSON.stringify(userRole)': JSON.stringify(userRole),
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Session check failed',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
