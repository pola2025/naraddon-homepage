import { NextRequest, NextResponse } from 'next/server';
import { generateCsrfToken, CSRF_COOKIE_OPTIONS } from '@/lib/csrf';

/**
 * CSRF 토큰 발급 API
 * GET /api/auth/csrf
 *
 * 클라이언트가 이 엔드포인트를 호출하면:
 * 1. 서버가 랜덤 CSRF 토큰 생성
 * 2. 쿠키에 토큰 저장 (HttpOnly)
 * 3. 클라이언트에 토큰 반환
 */
export async function GET(request: NextRequest) {
  try {
    const token = generateCsrfToken();

    const response = NextResponse.json({
      token,
      success: true,
    });

    // CSRF 토큰을 HttpOnly 쿠키에 저장
    response.cookies.set(
      CSRF_COOKIE_OPTIONS.name,
      token,
      {
        httpOnly: CSRF_COOKIE_OPTIONS.httpOnly,
        secure: CSRF_COOKIE_OPTIONS.secure,
        sameSite: CSRF_COOKIE_OPTIONS.sameSite,
        path: CSRF_COOKIE_OPTIONS.path,
        maxAge: CSRF_COOKIE_OPTIONS.maxAge,
      }
    );

    return response;
  } catch (error) {
    console.error('[CSRF] Token generation error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'CSRF 토큰 생성에 실패했습니다.',
      },
      { status: 500 }
    );
  }
}
