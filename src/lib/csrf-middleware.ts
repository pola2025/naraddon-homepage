import { NextRequest, NextResponse } from 'next/server';
import { verifyCsrfToken, CSRF_COOKIE_OPTIONS, CSRF_HEADER } from './csrf';
import { validateRateLimit, RateLimitConfig } from './rate-limit-middleware';

/**
 * CSRF 토큰 검증 미들웨어
 *
 * POST, PUT, PATCH, DELETE 요청에 대해 CSRF 토큰 검증
 * GET 요청은 CSRF 검증을 하지 않음
 *
 * @param request Next.js 요청 객체
 * @returns 검증 성공 시 null, 실패 시 에러 응답
 */
export function validateCsrfToken(request: NextRequest): NextResponse | null {
  const method = request.method;

  // GET, HEAD, OPTIONS 요청은 CSRF 검증 제외
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return null;
  }

  // 쿠키에서 CSRF 토큰 가져오기
  const cookieToken = request.cookies.get(CSRF_COOKIE_OPTIONS.name)?.value;

  // 헤더에서 CSRF 토큰 가져오기
  const headerToken = request.headers.get(CSRF_HEADER);

  // CSRF 토큰 검증
  if (!verifyCsrfToken(cookieToken, headerToken)) {
    return NextResponse.json(
      {
        success: false,
        message: 'CSRF 토큰이 유효하지 않습니다.',
        error: 'INVALID_CSRF_TOKEN',
      },
      { status: 403 }
    );
  }

  return null;
}

/**
 * CSRF 보호가 적용된 API 핸들러 래퍼
 *
 * @example
 * ```ts
 * export const POST = withCsrfProtection(async (request) => {
 *   // 여기서는 CSRF 검증이 이미 완료됨
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withCsrfProtection(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    // CSRF 검증
    const csrfError = validateCsrfToken(request);
    if (csrfError) {
      return csrfError;
    }

    // 검증 통과 시 원래 핸들러 실행
    return handler(request);
  };
}

/**
 * CSRF + Rate Limiting 통합 보안 미들웨어
 * 관리자 인증 API에 사용 권장
 *
 * @example
 * ```ts
 * export const POST = withAdminSecurity(
 *   async (request) => {
 *     // CSRF + Rate Limiting 검증 완료
 *     return NextResponse.json({ success: true });
 *   },
 *   { maxRequests: 5, windowSeconds: 60 }
 * );
 * ```
 */
export function withAdminSecurity(
  handler: (request: NextRequest) => Promise<NextResponse>,
  rateLimitConfig: RateLimitConfig = {
    maxRequests: 5,
    windowSeconds: 60,
  }
) {
  return async (request: NextRequest) => {
    // 1. Rate Limit 검증 (먼저 체크)
    const rateLimitError = validateRateLimit(request, rateLimitConfig);
    if (rateLimitError) {
      return rateLimitError;
    }

    // 2. CSRF 검증
    const csrfError = validateCsrfToken(request);
    if (csrfError) {
      return csrfError;
    }

    // 3. 검증 통과 시 원래 핸들러 실행
    return handler(request);
  };
}
