import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // NextAuth 세션 확인
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });

  // 토큰이 있으면 블랙리스트 체크
  if (token) {
    try {
      const blacklistCheck = await fetch(`${request.nextUrl.origin}/api/auth/blacklist`, {
        headers: {
          cookie: request.headers.get('cookie') || ''
        }
      });

      const { blacklisted } = await blacklistCheck.json();

      if (blacklisted) {
        // 블랙리스트에 있는 토큰이면 로그인 페이지로 리다이렉트
        const response = NextResponse.redirect(new URL('/auth/login', request.url));

        // 쿠키 삭제
        response.cookies.delete('next-auth.session-token');
        response.cookies.delete('__Secure-next-auth.session-token');

        return response;
      }
    } catch (error) {
      // 블랙리스트 체크 실패 시 계속 진행
    }
  }

  // 로그인한 사용자가 있고, 콜백 페이지에서 왔을 때
  if (token && pathname === '/api/auth/callback/naver') {
    // 프로필 완성 여부를 체크하기 위해 마이페이지로 리다이렉트
    return NextResponse.redirect(new URL('/mypage', request.url));
  }

  if (token && pathname === '/api/auth/callback/kakao') {
    // 프로필 완성 여부를 체크하기 위해 마이페이지로 리다이렉트
    return NextResponse.redirect(new URL('/mypage', request.url));
  }

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
    '/api/auth/callback/:path*',
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};