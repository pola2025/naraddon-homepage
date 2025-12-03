import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth-options';
import clientPromise from '@/lib/mongodb-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        {
          authenticated: false,
          message: '세션이 없습니다.'
        },
        { status: 401 }
      );
    }

    // 세션의 role 대신 MongoDB에서 직접 최신 role, isAdmin 조회 (캐시 우회)
    let userRole = (session.user as any)?.role;
    let isAdmin = (session.user as any)?.isAdmin || false;

    if (session.user?.email) {
      try {
        const client = await clientPromise;
        const db = client.db('naraddon');
        const user = await db.collection('users').findOne({ email: session.user.email });

        console.log('[check-session] Email:', session.user.email);
        console.log('[check-session] User from DB:', user ? { email: user.email, role: user.role, isAdmin: user.isAdmin } : 'NOT FOUND');

        if (user) {
          if (user.role) {
            userRole = user.role;
          }
          // isAdmin 플래그 확인
          isAdmin = user.isAdmin === true;
          console.log('[check-session] Role:', userRole, 'isAdmin:', isAdmin);
        }
      } catch (dbError) {
        console.error('[check-session] MongoDB query error:', dbError);
        // DB 조회 실패 시 세션 값 사용
      }
    }

    return NextResponse.json(
      {
        authenticated: true,
        message: '세션이 유효합니다.',
        user: {
          email: session.user?.email,
          name: session.user?.name,
          role: userRole,
          isAdmin: isAdmin
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { error: '세션 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}