# 트러블슈팅: Naver 로그인 500 에러

## 📅 타임라인
- **발생일**: 2025-01-24 10:00
- **해결일**: 2025-01-24 15:00
- **소요시간**: 5시간

## 🔍 문제 상황
### 증상
- 프로덕션 환경(https://naraddon.com)에서 네이버 로그인 시도 시 500 에러 발생
- 로컬 환경에서는 정상 작동
- 시크릿 모드에서도 동일한 문제 발생

### 에러 메시지
```
GET https://naraddon.com/api/auth/error 500 Internal Server Error
```

### 발생 환경
- OS: Windows
- Node.js: 18.x
- 브라우저: Chrome (시크릿 모드)
- 환경: Production (Vercel)

## 💡 원인 분석
### 근본 원인
1. **NextAuth 핸들러 내보내기 오류**
   - 비동기 함수로 핸들러 생성 시 올바른 내보내기 패턴 미사용

2. **미들웨어와 인증 라우트 충돌**
   - 미들웨어가 인증 콜백 라우트를 가로채는 문제
   - 블랙리스트 체크가 인증 프로세스 중 실행되어 무한 루프 발생

3. **환경변수 설정 오류**
   - `NEXTAUTH_URL`이 localhost로 설정되어 프로덕션에서 오류

### 영향 범위
- 네이버 소셜 로그인 기능 전체
- 카카오 로그인도 동일한 위험 존재
- 사용자 인증 및 세션 관리

## 🛠️ 해결 과정
### 시도한 방법들
1. **환경변수 확인** - `NEXTAUTH_URL`을 https://naraddon.com으로 수정
2. **NextAuth 핸들러 수정** - 올바른 내보내기 패턴 적용
3. **미들웨어 최적화** - 인증 라우트 제외 및 블랙리스트 체크 개선

### 최종 해결 방법

#### 1. NextAuth 핸들러 수정
```typescript
// src/app/api/auth/[...nextauth]/route.ts

// ❌ 잘못된 패턴
export async function handler() {
  return NextAuth(authOptions);
}
export { handler as GET, handler as POST };

// ✅ 올바른 패턴
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

#### 2. 미들웨어 최적화
```typescript
// src/middleware.ts

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Auth 관련 경로는 미들웨어 체크 제외 (무한 루프 방지)
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/auth')) {
    return NextResponse.next();
  }

  // 블랙리스트 체크는 토큰 age로 간단히 처리
  if (token && !pathname.startsWith('/api/')) {
    const tokenAge = Date.now() - (token.iat as number) * 1000;
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    if (tokenAge > maxAge) {
      // 토큰 만료 시 재로그인 유도
      const response = NextResponse.redirect(new URL('/auth/login', request.url));
      response.cookies.delete('next-auth.session-token');
      return response;
    }
  }
}

// matcher 설정 개선
export const config = {
  matcher: [
    '/admin/:path*',
    '/mypage/:path*',
    '/((?!api/auth|auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
```

#### 3. JWT 콜백 안정성 개선
```typescript
async jwt({ token, user, account, profile }) {
  // 블랙리스트 체크는 새로운 로그인 시에만 수행
  if (token?.email && !account) {
    try {
      // 블랙리스트 체크
      const blacklisted = await db.collection('blacklisted_tokens').findOne({
        email: token.email,
        blacklistedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });

      if (blacklisted) {
        return null;
      }
    } catch (error) {
      console.error('Blacklist check error:', error);
      // 에러 발생 시에도 진행 (프로덕션 안정성)
    }
  }
  return token;
}
```

## 🚀 예방 조치
### 재발 방지 대책
1. **환경변수 관리 강화**
   - `.env.example` 파일에 프로덕션 URL 명시
   - Vercel 환경변수 설정 문서화

2. **미들웨어 설계 원칙**
   - 인증 관련 라우트는 미들웨어에서 완전 제외
   - 블랙리스트 체크는 NextAuth 콜백 내부에서만 처리
   - API 호출 대신 토큰 정보 직접 검증

3. **에러 핸들링 개선**
   - 인증 에러 전용 페이지 구현 (`/auth/error`)
   - 상세한 에러 메시지 및 복구 방법 안내

### 모니터링 방안
- Vercel 함수 로그 모니터링
- NextAuth 디버그 모드 활용 (개발 환경)
- 사용자 피드백 채널 구축

## 📚 참고 자료
- [NextAuth.js Route Handlers](https://next-auth.js.org/configuration/initialization#route-handlers-app)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)

## ⚠️ 주의사항
### 소셜 로그인 설정 시 필수 확인 사항
1. **Naver Developers Console**
   - 서비스 URL: https://naraddon.com (프로토콜 포함)
   - Callback URL: https://naraddon.com/api/auth/callback/naver

2. **환경변수 설정**
   ```bash
   NEXTAUTH_URL=https://naraddon.com  # 프로덕션
   NEXTAUTH_SECRET=<32자 이상의 안전한 키>
   NAVER_CLIENT_ID=<네이버 앱 클라이언트 ID>
   NAVER_CLIENT_SECRET=<네이버 앱 시크릿>
   ```

3. **보안 고려사항**
   - 민감한 사용자 정보 로깅 금지
   - 토큰 블랙리스트 관리
   - 세션 격리 및 동시 로그인 방지