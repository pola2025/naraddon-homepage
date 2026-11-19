import { NextRequest, NextResponse } from 'next/server';
import type { NextFetchEvent } from 'next/server';
import {
  CRAWLER_RE,
  TRAP_URL_PREFIX,
  classify,
  findCanary,
  mintCanary,
  readCanary,
  renderBait,
  resolveClientIp,
  sendReport,
  shouldReport,
  type GuardReport,
  type SiteInfo,
} from './lib/guard';

/**
 * 글로벌 미들웨어 - 스캐너 대응 + 해외 IP 차단 + 블랙리스트 차단
 *
 * @purpose 스캐너 IP 자동 차단, 해외 IP 사이트 접근 차단, 블랙리스트 IP 차단
 * @context Vercel Edge에서 실행 - x-vercel-ip-country 헤더로 국가 판별
 * @decision 한국(KR) + 로컬 개발환경 + 검색엔진·AI 검색·링크 미리보기 로봇만 허용 (2026-11-19 로봇 예외 추가)
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

// 해외 차단에서 빼 주는 검색엔진 · AI 검색 · 링크 미리보기 로봇 (2026-11-19).
// 구글봇 · 빙 등은 미국 IP로 오기 때문에 예전에는 robots.txt · sitemap 말고 모든 페이지가 403이었다.
// AI 학습용 수집 로봇(GPTBot · CCBot · Bytespider · ClaudeBot 등)은 검색 노출과 상관없어 넣지 않는다.
// UA는 위조할 수 있으므로 이 예외는 페이지 열람만 열고 /api · /admin 은 열지 않는다.
const SEARCH_BOT_RE =
  /googlebot|google-inspectiontool|storebot-google|adsbot-google|mediapartners-google|bingbot|msnbot|bingpreview|yeti|naverbot|daumoa|duckduckbot|applebot|yandexbot|oai-searchbot|chatgpt-user|perplexitybot|perplexity-user|claude-searchbot|claude-user|facebookexternalhit|facebookcatalog|meta-externalfetcher|kakaotalk-scrap|twitterbot|slackbot|linkedinbot|telegrambot|discordbot|whatsapp|pinterestbot/i;

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

// ═══ 스캐너 대응 (2026-11-19, 폴라애드 · BAS 와 같은 장치. 설명은 lib/guard.ts 맨 위 · F:\polarad_frontend\workers\guard\README.md) ═══
// - 미끼 경로(/.env · /.git/config · wp-* · .php 등): 가짜 설정 파일(200) 또는 404 를 주고, 접속 IP 를 polarad-guard Worker 에 신고 → Vercel 방화벽 차단
// - 함정 주소(/internal/<서명 토큰>/…): 미끼 파일 안에만 있다. 접속하면 401 + 신고
// - /api: 미끼 값이 인증 헤더 · 쿼리에 실려 오면 401 + 신고. 그 밖에는 아래 기존 흐름을 그대로 탄다
// - 검색엔진 · AI 검색 · 링크 미리보기 UA 는 미끼 경로에서 404 만 받고 신고되지 않는다
// - 해외 IP 도 미끼 경로에 오면 신고한다(해외 차단보다 먼저 판별해야 차단 목록에 오른다)
// - GUARD_SECRET 이 없으면 장치가 꺼진다(미끼 경로는 404, /api 는 기존 흐름)
const SITE: SiteInfo = { key: 'naraddon', domain: 'naraddon.com', db: 'naraddon' };

const NO_INDEX = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'X-Content-Type-Options': 'nosniff',
};
const notFound = () =>
  new NextResponse('Not Found\n', {
    status: 404,
    headers: { ...NO_INDEX, 'Content-Type': 'text/plain; charset=utf-8' },
  });
const guardUnauthorized = () => NextResponse.json({ ok: false }, { status: 401, headers: NO_INDEX });

// Vercel 은 x-real-ip · x-forwarded-for 를 방문자 주소로 덮어쓴다(위조 불가).
function guardClientIp(req: NextRequest) {
  const peer =
    req.headers.get('x-real-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || '';
  return resolveClientIp(peer, req.headers.get('cf-connecting-ip'));
}

// 신고 받는 곳. 운영은 polarad-guard Worker 고정이고, GUARD_REPORT_URL 은 로컬 검증 전용이다.
const reportUrl = () => process.env.GUARD_REPORT_URL || 'https://polarad-guard.mkt9834.workers.dev/guard-report';
// 미끼 속 주소(API · 함정 주소)의 바탕. 운영은 https://naraddon.com, GUARD_SITE_ORIGIN 은 로컬 검증 전용이다.
const siteOrigin = () => (process.env.GUARD_SITE_ORIGIN || 'https://naraddon.com').replace(/\/+$/, '');

function report(event: NextFetchEvent, secret: string, r: GuardReport) {
  if (shouldReport(r.ip, r.reason)) event.waitUntil(sendReport(reportUrl(), secret, r));
}

/** 스캐너 대응이 응답을 정하면 그 응답을, 아니면 null(기존 흐름 계속)을 돌려준다. */
async function guard(req: NextRequest, event: NextFetchEvent): Promise<NextResponse | null> {
  const path = req.nextUrl.pathname;
  const ua = req.headers.get('user-agent') ?? '';
  const secret = process.env.GUARD_SECRET || '';

  // 1) 미끼 경로
  const kind = classify(path);
  if (kind) {
    if (!secret || CRAWLER_RE.test(ua)) return notFound();
    const ip = guardClientIp(req);
    report(event, secret, { reason: 'trap', site: SITE.key, ip, path, ua, kind });
    if (kind === 'none') return notFound();
    const [a, b, t] = await Promise.all([
      mintCanary(secret, ip),
      mintCanary(secret, ip),
      mintCanary(secret, ip, Date.now(), 'trap'),
    ]);
    const origin = siteOrigin();
    const body = renderBait(kind, SITE, a, b, {
      apiBase: `${origin}/api`,
      trapBase: `${origin}${TRAP_URL_PREFIX}${t}`,
    });
    return new NextResponse(req.method === 'HEAD' ? null : body, {
      status: 200,
      headers: { ...NO_INDEX, 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 2) 함정 주소(/internal/<토큰>/…). 서명이 맞는 토큰이면 접속한 쪽을 신고한다. 토큰이 틀리면 404 만 준다.
  if (path === '/internal' || path.startsWith(TRAP_URL_PREFIX)) {
    const seg = path.split('/');
    const token = (seg[2] || '').toLowerCase();
    const hit = secret ? await readCanary(secret, token, 'trap') : null;
    if (!hit) return notFound();
    report(event, secret, {
      reason: 'trapurl',
      site: SITE.key,
      ip: guardClientIp(req),
      // 토큰 원문은 경로에 남기지 않는다(canary 칸으로만 보낸다)
      path: `${TRAP_URL_PREFIX}…/${seg.slice(3).join('/')}`.slice(0, 80),
      ua,
      canary: token,
    });
    return guardUnauthorized();
  }

  // 3) /api: 미끼 값이 인증 헤더 · 쿼리에 실려 오면 쓰인 것으로 보고 신고한다. 아니면 null 이라 기존 흐름이 그대로 이어진다.
  if (secret && (path === '/api' || path.startsWith('/api/'))) {
    const hit = await findCanary(secret, [
      req.headers.get('authorization'),
      req.headers.get('x-api-key'),
      req.headers.get('x-admin-token'),
      req.nextUrl.search,
    ]);
    if (!hit) return null;
    report(event, secret, {
      reason: 'canary',
      site: SITE.key,
      ip: guardClientIp(req),
      path,
      ua,
      canary: hit.token,
    });
    return guardUnauthorized();
  }
  return null;
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  // 0. 스캐너 대응 (미끼 경로 · 함정 주소 · 미끼 값이 실린 /api 만 여기서 끝난다)
  const guarded = await guard(request, event);
  if (guarded) return guarded;

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

  // 2.1. 검색엔진 · AI 검색 · 링크 미리보기 로봇은 페이지만 통과 (/api · /admin 은 그대로 차단)
  const ua = request.headers.get('user-agent') || '';
  if (SEARCH_BOT_RE.test(ua) && !pathname.startsWith('/api') && !pathname.startsWith('/admin')) {
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
