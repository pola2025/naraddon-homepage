import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * GET /api/naraddon-tube/get-password
 * 관리자 세션이 있을 때만 NARADDON_TUBE_PASSWORD 반환
 * 2중 인증 문제 해결용
 */
export async function GET(request: NextRequest) {
  try {
    // NextAuth 세션 확인
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // MongoDB에서 사용자 role 확인 (간단하게 환경변수 체크로 대체 가능)
    // 실제로는 check-session API와 같은 로직 사용
    const userEmail = session.user.email;

    // 간단한 role 체크 (실제 구현에서는 DB 조회)
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/check-session`, {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const userData = await res.json();
    const userRole = userData.user?.role;

    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // 관리자 확인되면 NARADDON_TUBE_PASSWORD 반환
    const password = process.env.NARADDON_TUBE_PASSWORD;

    if (!password) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    return NextResponse.json({ password });
  } catch (error) {
    console.error('[get-password] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
