import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import clientPromise from '@/lib/mongodb-client';

/**
 * DEBUG: Session 정보 확인 API
 *
 * @purpose 현재 사용자의 세션 정보와 DB role을 비교 검증
 * @security 본인만 자신의 정보 조회 가능
 */
export async function GET(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'No session found'
      }, { status: 401 });
    }

    // MongoDB에서 실제 role 조회
    const client = await clientPromise;
    const db = client.db('naraddon');
    const dbUser = await db.collection('users').findOne(
      { email: session.user.email },
      { projection: { email: 1, name: 1, role: 1, createdAt: 1, lastLoginAt: 1 } }
    );

    return NextResponse.json({
      session: {
        email: session.user.email,
        name: session.user.name,
        role: (session.user as any)?.role,
        roleType: typeof (session.user as any)?.role,
        provider: (session.user as any)?.provider,
      },
      database: dbUser ? {
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        roleType: typeof dbUser.role,
        createdAt: dbUser.createdAt,
        lastLoginAt: dbUser.lastLoginAt,
      } : null,
      comparison: {
        sessionRole: (session.user as any)?.role,
        dbRole: dbUser?.role,
        matches: (session.user as any)?.role === dbUser?.role,
        isAdmin: (session.user as any)?.role === 'admin' || (session.user as any)?.role === 'super_admin',
        dbIsAdmin: dbUser?.role === 'admin' || dbUser?.role === 'super_admin',
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Debug session error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
