import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Auth 관련 경로는 미들웨어 체크 제외 (무한 루프 방지)
  // 콜백, 에러, 블랙리스트 체크 경로 모두 제외
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/auth')) {
    return NextResponse.next();
  }

  // NextAuth 세션 확인
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });

  // 블랙리스트 체크는 일반 페이지 접근 시에만 수행
  // API 경로는 제외 (중복 체크 방지)
  if (token && !pathname.startsWith('/api/')) {
    try {
      // MongoDB 직접 확인 대신 토큰 내부 정보로 간단히 체크
      // 이미 NextAuth callbacks에서 블랙리스트 체크가 수행됨
      const tokenAge = Date.now() - (token.iat as number) * 1000;
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

      if (tokenAge > maxAge) {
        // 토큰이 너무 오래된 경우 재로그인 유도
        const response = NextResponse.redirect(new URL('/auth/login', request.url));
        response.cookies.delete('next-auth.session-token');
        response.cookies.delete('__Secure-next-auth.session-token');
        return response;
      }
    } catch (error) {
      // 체크 실패 시 계속 진행
      console.error('Token validation failed:', error);
    }
  }

  // 콜백 처리는 NextAuth가 담당하므로 미들웨어에서 개입하지 않음

  // /admin 경로 처리
  if (pathname.startsWith('/admin')) {
    // NextAuth로 로그인한 사용자 체크
    if (token) {
      const userRole = (token as any)?.role;
      // admin 또는 super_admin이 아니면 접근 차단
      if (userRole !== 'admin' && userRole !== 'super_admin') {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } else {
      // 구 방식 admin 세션 체크 (호환성 유지)
      const sessionToken = request.cookies.get('admin-session')?.value;

      // 세션이 없으면 /admin 페이지로 리다이렉트 (로그인 폼 표시)
      // /admin 페이지 자체는 접근 허용 (로그인 폼이 있으므로)
      if (!sessionToken && pathname !== '/admin' && pathname !== '/admin/') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    }

    // API 경로는 미들웨어에서 처리하지 않음
    if (pathname.startsWith('/admin/api')) {
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/mypage/:path*',
    '/((?!api/auth|auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
};