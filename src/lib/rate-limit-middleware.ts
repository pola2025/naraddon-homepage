import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RateLimitConfig } from './rate-limit';

/**
 * 요청에서 클라이언트 IP 주소 추출
 * Vercel, Cloudflare 등 프록시 환경 지원
 *
 * @param request Next.js 요청 객체
 * @returns IP 주소
 */
function getClientIp(request: NextRequest): string {
  // Vercel/Cloudflare 프록시 헤더 확인
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // 여러 IP가 있을 경우 첫 번째 (클라이언트 IP)
    return forwarded.split(',')[0].trim();
  }

  // Cloudflare
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Vercel
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // 기본값
  return request.ip || 'unknown';
}

/**
 * Rate Limiting 적용 응답 헤더 추가
 *
 * @param response 응답 객체
 * @param remaining 남은 요청 수
 * @param limit 총 요청 한도
 * @param resetInSeconds 제한 해제까지 남은 시간 (초)
 */
function addRateLimitHeaders(
  response: NextResponse,
  remaining: number,
  limit: number,
  resetInSeconds: number
): void {
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', resetInSeconds.toString());
}

/**
 * Rate Limiting 미들웨어
 *
 * @param request Next.js 요청 객체
 * @param config Rate Limit 설정
 * @returns 제한 초과 시 에러 응답, 아니면 null
 */
export function validateRateLimit(
  request: NextRequest,
  config: RateLimitConfig = {}
): NextResponse | null {
  const clientIp = getClientIp(request);

  // Rate Limit 체크
  const result = checkRateLimit(clientIp, config);

  // 제한 초과
  if (!result.allowed) {
    const response = NextResponse.json(
      {
        success: false,
        message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
        error: 'RATE_LIMIT_EXCEEDED',
        retryAfter: result.resetInSeconds,
      },
      { status: 429 }
    );

    addRateLimitHeaders(
      response,
      result.remaining,
      result.limit,
      result.resetInSeconds
    );

    // Retry-After 헤더 추가 (표준)
    response.headers.set('Retry-After', result.resetInSeconds.toString());

    return response;
  }

  return null;
}

/**
 * Rate Limiting이 적용된 API 핸들러 래퍼
 *
 * @example
 * ```ts
 * export const POST = withRateLimit(
 *   async (request) => {
 *     // 여기서는 Rate Limit 검증이 이미 완료됨
 *     return NextResponse.json({ success: true });
 *   },
 *   { maxRequests: 5, windowSeconds: 60 }
 * );
 * ```
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig = {}
) {
  return async (request: NextRequest) => {
    // Rate Limit 검증
    const rateLimitError = validateRateLimit(request, config);
    if (rateLimitError) {
      return rateLimitError;
    }

    // 검증 통과 시 원래 핸들러 실행
    const response = await handler(request);

    // Rate Limit 정보를 응답 헤더에 추가
    const clientIp = getClientIp(request);
    const result = checkRateLimit(clientIp, config);

    addRateLimitHeaders(
      response,
      result.remaining,
      result.limit,
      result.resetInSeconds
    );

    return response;
  };
}

/**
 * CSRF + Rate Limiting 동시 적용 래퍼
 * (보안 강화)
 */
export function withSecurityProtection(
  handler: (request: NextRequest) => Promise<NextResponse>,
  rateLimitConfig: RateLimitConfig = {}
) {
  return async (request: NextRequest) => {
    // 1. Rate Limit 검증
    const rateLimitError = validateRateLimit(request, rateLimitConfig);
    if (rateLimitError) {
      return rateLimitError;
    }

    // 2. 원래 핸들러 실행 (CSRF는 withCsrfProtection 사용 가정)
    return handler(request);
  };
}
