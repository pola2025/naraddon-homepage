import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';
import { sanitizeMongoInput } from '@/lib/nosql-sanitize';

/**
 * 페이지 방문 추적 API
 *
 * @purpose 사용자의 페이지 방문 기록을 MongoDB에 저장
 * @context 관리자 대시보드의 방문 통계를 위해 사용
 * @security 필드 allowlist + NoSQL 새니타이즈 (rate limit은 middleware에서 처리)
 * @perf DB 1회 호출만 유지 — 매 페이지 이동마다 호출되므로 성능 최우선
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
    const ip =
      request.ip ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

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

    // MongoDB에 방문 기록 저장 (DB 1회 호출)
    const client = await clientPromise;
    const db = client.db('naraddon');

    const utmParams = data.utmParams as Record<string, unknown>;

    const result = await db.collection('page-visits').insertOne({
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
