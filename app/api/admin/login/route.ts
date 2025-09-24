import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword, createAdminSession } from '@/lib/auth/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: '비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 비밀번호 검증
    const isValid = verifyAdminPassword(password);

    if (!isValid) {
      return NextResponse.json(
        { error: '비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    // 세션 생성
    const sessionToken = await createAdminSession();

    return NextResponse.json(
      {
        success: true,
        message: '로그인되었습니다.',
        sessionToken
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}