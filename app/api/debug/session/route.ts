import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import clientPromise from '@/lib/mongodb-client';
import { getToken } from 'next-auth/jwt';

/**
 * DEBUG: Session 정보 확인 API
 *
 * @purpose 현재 사용자의 세션 정보와 DB role을 비교 검증
 * @security 본인만 자신의 정보 조회 가능
 */
export async function GET(request: NextRequest) {
  try {
    // JWT 토큰 직접 확인
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'No session found',
        token: token ? {
          email: token.email,
          role: token.role,
          roleType: typeof token.role,
        } : null
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
      token: token ? {
        email: token.email,
        role: token.role,
        roleType: typeof token.role,
        id: token.id,
        sub: token.sub,
      } : null,
      session: {
        email: session.user.email,
        name: session.user.name,
        role: (session.user as any)?.role,
        roleType: typeof (session.user as any)?.role,
        provider: (session.user as any)?.provider,
        fullUser: session.user,
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
        tokenRole: token?.role,
        sessionRole: (session.user as any)?.role,
        dbRole: dbUser?.role,
        tokenMatchesDb: token?.role === dbUser?.role,
        sessionMatchesDb: (session.user as any)?.role === dbUser?.role,
        isAdmin: (session.user as any)?.role === 'admin' || (session.user as any)?.role === 'super_admin',
        dbIsAdmin: dbUser?.role === 'admin' || dbUser?.role === 'super_admin',
        tokenIsAdmin: token?.role === 'admin' || token?.role === 'super_admin',
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
