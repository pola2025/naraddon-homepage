import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';
import { checkRateLimit, recordRateLimitHit } from '@/lib/rate-limit-middleware';
import { sanitizeMongoInput } from '@/lib/nosql-sanitize';

/**
 * 페이지 방문 추적 API
 *
 * @purpose 사용자의 페이지 방문 기록을 MongoDB에 저장
 * @context 관리자 대시보드의 방문 통계를 위해 사용
 * @security rate limiting (30/분/IP), 필드 allowlist, NoSQL 새니타이즈
 */

/* 허용 필드만 추출 */
function pickVisitFields(body: Record<string, unknown>) {
  return {
    pathname: typeof body.pathname === 'string' ? body.pathname.slice(0, 500) : '',
    referrer: typeof body.referrer === 'string' ? body.referrer.slice(0, 1000) : '',
    firstReferrer: typeof body.firstReferrer === 'string' ? body.firstReferrer.slice(0, 1000) : '',
    sessionId: typeof body.sessionId === 'string' ? body.sessionId.slice(0, 100) : '',
    pageViewCount: typeof body.pageViewCount === 'number' ? body.pageViewCount : 1,
    utmParams:
      body.utmParams && typeof body.utmParams === 'object'
        ? (sanitizeMongoInput(body.utmParams) as Record<string, unknown>)
        : {},
  };
}

export async function POST(request: NextRequest) {
  try {
    // IP 추출
    const ip =
      request.ip ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Rate limiting (30 요청/분/IP)
    const rlKey = `visit:${ip}`;
    const rl = await checkRateLimit({
      key: rlKey,
      maxRequests: 30,
      windowSeconds: 60,
      collection: 'rate-limits-visit',
    });
    if (!rl.allowed) {
      return NextResponse.json({ success: false }, { status: 429 });
    }
    await recordRateLimitHit(rlKey, 'rate-limits-visit');

    const userAgent = request.headers.get('user-agent') || 'unknown';

    // 안전한 JSON 파싱
    let rawBody: Record<string, unknown>;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    // 필드 allowlist + 새니타이즈
    const data = pickVisitFields(rawBody);

    if (!data.pathname) {
      return NextResponse.json({ error: 'pathname is required' }, { status: 400 });
    }

    // MongoDB에 방문 기록 저장
    const client = await clientPromise;
    const db = client.db('naraddon');
    const visitsCollection = db.collection('page-visits');

    const utmParams = data.utmParams as Record<string, unknown>;

    const result = await visitsCollection.insertOne({
      pathname: data.pathname,
      ip,
      userAgent,
      referer: data.referrer,
      firstReferrer: data.firstReferrer,
      sessionId: data.sessionId,
      pageViewCount: data.pageViewCount,
      utmSource: typeof utmParams.source === 'string' ? utmParams.source : '',
      utmMedium: typeof utmParams.medium === 'string' ? utmParams.medium : '',
      utmCampaign: typeof utmParams.campaign === 'string' ? utmParams.campaign : '',
      timeSpent: 0,
      timestamp: new Date(),
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      visitId: result.insertedId.toString(),
    });
  } catch (error) {
    console.error('[나라똔:방문추적] Error:', error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
