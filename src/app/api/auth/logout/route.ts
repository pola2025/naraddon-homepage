import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb-client';

export async function POST(request: NextRequest) {
  try {
    // 현재 세션과 토큰 가져오기
    const session = await getServerSession(authOptions);
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });

    const client = await clientPromise;
    const db = client.db('naraddon');

    if (session?.user?.email) {
      // MongoDB에서 마지막 로그아웃 시간 기록
      await db.collection('users').updateOne(
        { email: session.user.email },
        {
          $set: {
            lastLogoutAt: new Date(),
            isLoggedIn: false
          }
        }
      );
    }

    // 토큰을 블랙리스트에 추가
    if (token) {
      await db.collection('blacklisted_tokens').insertOne({
        jti: (token as any).sessionId || `${token.email}-${Date.now()}`,
        email: token.email,
        blacklistedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    }

    // 모든 쿠키 삭제
    const response = NextResponse.json({ success: true });

    // NextAuth 관련 쿠키들 명시적으로 삭제
    const cookiesToDelete = [
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'next-auth.csrf-token',
      '__Host-next-auth.csrf-token',
      'next-auth.callback-url',
      '__Secure-next-auth.callback-url'
    ];

    cookiesToDelete.forEach(cookieName => {
      response.cookies.set(cookieName, '', {
        maxAge: 0,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        httpOnly: true
      });
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout properly' },
      { status: 500 }
    );
  }
}