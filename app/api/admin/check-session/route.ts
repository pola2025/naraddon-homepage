import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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

    const userRole = (session.user as any)?.role;

    return NextResponse.json(
      {
        authenticated: true,
        message: '세션이 유효합니다.',
        user: {
          email: session.user?.email,
          name: session.user?.name,
          role: userRole
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