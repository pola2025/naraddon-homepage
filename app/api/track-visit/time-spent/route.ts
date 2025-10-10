import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

/**
 * 체류시간 업데이트 API
 *
 * @purpose 사용자의 페이지 체류시간을 MongoDB에 업데이트
 * @context 페이지 이탈 또는 페이지 변경 시 호출
 * @decision
 * - sendBeacon 또는 keepalive fetch로 호출
 * - 페이지 언로드 시에도 안정적으로 전송
 * - visitId로 기존 방문 기록 찾아서 업데이트
 */
export async function POST(request: NextRequest) {
  try {
    // 요청 본문에서 데이터 가져오기
    const body = await request.json();
    const { visitId, timeSpent } = body;

    if (!visitId || typeof timeSpent !== 'number') {
      return NextResponse.json(
        { error: 'visitId and timeSpent are required' },
        { status: 400 }
      );
    }

    // MongoDB에서 방문 기록 업데이트
    const client = await clientPromise;
    const db = client.db('naraddon');
    const visitsCollection = db.collection('page-visits');

    await visitsCollection.updateOne(
      { _id: new ObjectId(visitId) },
      {
        $set: {
          timeSpent: timeSpent,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[track-visit/time-spent] Error:', error);

    // 체류시간 업데이트 실패해도 200 반환 (사용자 경험에 영향 없도록)
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
