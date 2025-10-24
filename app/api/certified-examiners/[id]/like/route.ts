import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

/**
 * POST /api/certified-examiners/[id]/like
 *
 * @purpose 심사관 브랜드 페이지 좋아요 증가
 * @context 사용자가 좋아요 버튼 클릭 시 호출
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const examinerId = params.id;

    console.log('[Brand Page Like API] Liking examiner:', examinerId);

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    // ObjectId 변환 시도
    let result;
    try {
      result = await db.collection('expert-examiners').findOneAndUpdate(
        { _id: new ObjectId(examinerId) },
        { $inc: { likes: 1 } },
        { returnDocument: 'after', projection: { likes: 1 } }
      );
    } catch (error) {
      // ObjectId 변환 실패 시 문자열로 검색
      result = await db.collection('expert-examiners').findOneAndUpdate(
        { _id: examinerId },
        { $inc: { likes: 1 } },
        { returnDocument: 'after', projection: { likes: 1 } }
      );
    }

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Examiner not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      likes: result.likes || 0,
    });
  } catch (error) {
    console.error('Failed to like examiner:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
