import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';

/**
 * 전환 이벤트 저장 API
 *
 * @purpose 사용자 전환 이벤트를 MongoDB에 저장
 * @context 전환 퍼널 분석, 캠페인 성과 측정에 사용
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sessionId,
      userId,
      conversionType,
      value,
      metadata,
      funnelStep,
      timestamp,
    } = body;

    // 필수 필드 검증
    if (!sessionId || !conversionType) {
      return NextResponse.json(
        { error: 'sessionId and conversionType are required' },
        { status: 400 }
      );
    }

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');
    const conversionsCollection = db.collection('conversions');

    // 전환 이벤트 저장
    const result = await conversionsCollection.insertOne({
      sessionId,
      userId: userId || null,
      conversionType,
      value: value || 0,
      metadata: metadata || {},
      funnelStep: funnelStep || null,
      timestamp: new Date(timestamp),
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      conversionId: result.insertedId.toString(),
    });
  } catch (error) {
    console.error('[Analytics/Conversions] Error:', error);

    // 전환 추적 실패해도 사용자 경험에 영향 없도록 200 반환
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

/**
 * 전환 이벤트 조회 API
 *
 * @purpose 관리자가 전환 이벤트 데이터를 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const conversionType = searchParams.get('conversionType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');
    const conversionsCollection = db.collection('conversions');

    // 쿼리 조건 생성
    const query: any = {};

    if (sessionId) {
      query.sessionId = sessionId;
    }

    if (conversionType) {
      query.conversionType = conversionType;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }

    // 전환 이벤트 조회
    const conversions = await conversionsCollection
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      conversions,
      total: conversions.length,
    });
  } catch (error) {
    console.error('[Analytics/Conversions] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversions' },
      { status: 500 }
    );
  }
}
