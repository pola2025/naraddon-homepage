import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';

/**
 * 페이지 방문 추적 API
 *
 * @purpose 사용자의 페이지 방문 기록을 MongoDB에 저장
 * @context 관리자 대시보드의 방문 통계를 위해 사용
 * @decision
 * - 클라이언트에서 호출하는 단순한 POST 요청으로 구현
 * - document.referrer를 클라이언트에서 전송받아 실제 유입 경로 추적
 * - UTM 파라미터로 마케팅 캠페인 추적
 * - 세션 기반 첫 방문 유입 경로 저장
 * - 세션 ID와 페이지뷰 카운트 저장
 * - 생성된 visit ID 반환하여 체류시간 업데이트에 사용
 */
export async function POST(request: NextRequest) {
  try {
    // IP 주소 및 User Agent 수집
    const ip = request.ip ||
               request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const userAgent = request.headers.get('user-agent') || 'unknown';

    // 요청 본문에서 데이터 가져오기
    const body = await request.json();
    const {
      pathname,
      referrer = '',
      firstReferrer = '',
      sessionId = '',
      pageViewCount = 1,
      utmParams = {}
    } = body;

    if (!pathname) {
      return NextResponse.json(
        { error: 'pathname is required' },
        { status: 400 }
      );
    }

    // MongoDB에 방문 기록 저장
    const client = await clientPromise;
    const db = client.db('naraddon');
    const visitsCollection = db.collection('page-visits');

    const result = await visitsCollection.insertOne({
      pathname,
      ip,
      userAgent,
      // 클라이언트에서 받은 실제 유입 경로 (document.referrer)
      referer: referrer,
      // 세션 기반 첫 방문 유입 경로
      firstReferrer: firstReferrer,
      // 세션 ID (방문자별 고유 식별자)
      sessionId: sessionId,
      // 세션 내 페이지뷰 카운트
      pageViewCount: pageViewCount,
      // UTM 파라미터 (마케팅 캠페인 추적)
      utmSource: utmParams.source || '',
      utmMedium: utmParams.medium || '',
      utmCampaign: utmParams.campaign || '',
      // 체류시간 (나중에 업데이트됨)
      timeSpent: 0,
      timestamp: new Date(),
      createdAt: new Date(),
    });

    // 생성된 visit ID 반환
    return NextResponse.json({
      success: true,
      visitId: result.insertedId.toString()
    });
  } catch (error) {
    console.error('[track-visit] Error:', error);

    // 방문 추적 실패해도 사용자 경험에 영향 없도록 200 반환
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
