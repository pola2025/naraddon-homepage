import { NextRequest, NextResponse } from 'next/server';

/**
 * 글로벌 미들웨어 - 해외 IP 차단 + 블랙리스트 차단
 *
 * @purpose 해외 IP 사이트 접근 원천 차단, 블랙리스트 IP 차단
 * @context Vercel Edge에서 실행 - x-vercel-ip-country 헤더로 국가 판별
 * @decision 한국(KR) + 로컬 개발환경만 허용, 나머지 전부 차단
 * @note _next/static, _next/image, favicon 등 정적 리소스는 제외
 */

// 영구 블랙리스트 IP (SSRF 공격, 스팸 등)
const BLACKLISTED_IPS = new Set([
  '158.247.192.167', // SSRF 공격 시도 (2026-03-24)
]);

// NoSQL injection 패턴 (URL에서 감지)
const NOSQL_PATTERNS = /\[\$(?:ne|gt|gte|lt|lte|in|nin|regex|where|exists|or|and|not|nor)\]/i;

// 삭제된 위험 엔드포인트 (접근 완전 차단)
const BLOCKED_PATHS = new Set(['/api/git-execute']);

// 허용 국가 코드
const ALLOWED_COUNTRIES = new Set(['KR']);

// 차단 제외 경로 (정적 리소스, 헬스체크 등)
const EXCLUDED_PATHS = [
  '/_next/',
  '/favicon',
  '/images/',
  '/fonts/',
  '/api/health',
  '/robots.txt',
  '/sitemap',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 정적 리소스는 차단 안 함
  if (EXCLUDED_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // IP 추출
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const clientIp = forwarded?.split(',')[0].trim() || realIp || '';

  // 1. 블랙리스트 IP 차단 (최우선)
  if (clientIp && BLACKLISTED_IPS.has(clientIp)) {
    console.log(`[나라똔:미들웨어] 블랙리스트 차단: ${clientIp} → ${pathname}`);
    return new NextResponse('Access Denied', { status: 403 });
  }

  // 1.1. 삭제된 위험 경로 접근 차단
  if (BLOCKED_PATHS.has(pathname)) {
    console.warn(`[나라똔:미들웨어] 차단된 경로 접근: ${clientIp} → ${pathname}`);
    return new NextResponse('Not Found', { status: 404 });
  }

  // 1.2. NoSQL injection 패턴 감지 (쿼리스트링)
  const url = request.nextUrl.toString();
  if (NOSQL_PATTERNS.test(url)) {
    console.warn(`[나라똔:미들웨어] NoSQL injection 차단: ${clientIp} → ${url}`);
    return new NextResponse('Bad Request', { status: 400 });
  }

  // 1.5. IP 미식별 API 요청 차단 (프로덕션에서 IP 없으면 비정상)
  if (!clientIp && pathname.startsWith('/api/')) {
    console.log(`[나라똔:미들웨어] IP 미식별 API 차단: ${pathname}`);
    return new NextResponse('Access Denied', { status: 403 });
  }

  // 2. 해외 IP 차단 (Vercel 제공 국가 헤더)
  const country = request.headers.get('x-vercel-ip-country') || '';

  // 로컬 개발환경 (country 헤더 없음) 또는 허용 국가는 통과
  if (!country || ALLOWED_COUNTRIES.has(country)) {
    return NextResponse.next();
  }

  // 해외 IP 차단
  console.log(`[나라똔:미들웨어] 해외 IP 차단: ${clientIp} (${country}) → ${pathname}`);
  return new NextResponse(
    '이 서비스는 대한민국에서만 이용 가능합니다.\nThis service is only available in South Korea.',
    { status: 403 }
  );
}

export const config = {
  matcher: [
    /*
     * 모든 경로에 적용하되, 다음은 제외:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
