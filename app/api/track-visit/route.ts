import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';

/**
 * 페이지 방문 추적 API
 *
 * @purpose 사용자의 페이지 방문 기록을 MongoDB에 저장
 * @context 관리자 대시보드의 방문 통계를 위해 사용
 * @decision 클라이언트에서 호출하는 단순한 POST 요청으로 구현
 */
export async function POST(request: NextRequest) {
  try {
    // IP 주소 및 User Agent 수집
    const ip = request.ip ||
               request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referer = request.headers.get('referer') || '';

    // 요청 본문에서 pathname 가져오기
    const body = await request.json();
    const { pathname } = body;

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

    await visitsCollection.insertOne({
      pathname,
      ip,
      userAgent,
      referer,
      timestamp: new Date(),
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[track-visit] Error:', error);

    // 방문 추적 실패해도 사용자 경험에 영향 없도록 200 반환
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
