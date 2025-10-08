import { NextRequest, NextResponse } from 'next/server';
import { withAdminSecurity } from '@/lib/csrf-middleware';

// API Route를 동적으로 설정
export const dynamic = 'force-dynamic';

// 환경변수에서 비밀번호 가져오기 (서버 전용)
const ADMIN_PASSWORD = process.env.EXPERT_SERVICES_PASSWORD;

// 인증 확인 API (CSRF + Rate Limiting 보호 적용)
export const POST = withAdminSecurity(async (request: NextRequest) => {
  try {
    console.log('[expert-services/verify] POST request received');

    const body = await request.json();
    const { password } = body ?? {};

    console.log('[expert-services/verify] Checking password...');

    if (!ADMIN_PASSWORD) {
      console.error('[expert-services/verify] EXPERT_SERVICES_PASSWORD not set in environment');
      return NextResponse.json(
        {
          message: '서버 설정 오류: 비밀번호가 설정되지 않았습니다.',
        },
        { status: 500 }
      );
    }

    if (!password || password !== ADMIN_PASSWORD) {
      console.log('[expert-services/verify] Invalid password');
      return NextResponse.json(
        {
          message: '비밀번호가 올바르지 않습니다.',
        },
        { status: 401 }
      );
    }

    console.log('[expert-services/verify] Authentication successful');
    return NextResponse.json({
      success: true,
      message: '인증되었습니다.',
    });
  } catch (error) {
    console.error('[expert-services/verify] Error:', error);
    return NextResponse.json(
      {
        message: '비밀번호 확인에 실패했습니다.',
      },
      { status: 500 }
    );
  }
});
