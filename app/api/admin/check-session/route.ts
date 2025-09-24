import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession, extendAdminSession } from '@/lib/auth/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const isValid = await validateAdminSession();

    if (isValid) {
      // 세션 연장
      await extendAdminSession();

      return NextResponse.json(
        {
          authenticated: true,
          message: '세션이 유효합니다.'
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        authenticated: false,
        message: '세션이 없거나 만료되었습니다.'
      },
      { status: 401 }
    );
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { error: '세션 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}