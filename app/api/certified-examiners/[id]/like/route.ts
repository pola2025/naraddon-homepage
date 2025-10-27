import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

/**
 * POST /api/certified-examiners/[id]/like
 *
 * @purpose 심사관 브랜드 페이지 좋아요 증가 (IP 기반 1일 1회 제한)
 * @context 사용자가 좋아요 버튼 클릭 시 호출
 * @security IP 주소 기반으로 24시간 내 중복 좋아요 방지
 * @decision 사용자 인증 없이 IP 주소로 제한 (간편한 사용자 경험)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const examinerId = params.id;

    /**
     * IP 주소 추출
     *
     * @purpose 1일 1회 제한을 위한 사용자 식별
     * @note Vercel 프로덕션 환경에서는 x-forwarded-for 헤더 사용
     * @note 로컬 개발 환경에서는 x-real-ip 또는 기본값 사용
     */
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwardedFor?.split(',')[0].trim() || realIp || 'unknown';

    console.log('[Brand Page Like API] Liking examiner:', examinerId, 'from IP:', ip);

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    /**
     * 1일 1회 제한 체크
     *
     * @purpose 동일 IP에서 24시간 내 중복 좋아요 방지
     * @collection examiner-likes: IP별 좋아요 기록 저장
     * @schema { examinerId, ip, likedAt }
     */
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingLike = await db.collection('examiner-likes').findOne({
      examinerId,
      ip,
      likedAt: { $gte: oneDayAgo }
    });

    if (existingLike) {
      return NextResponse.json(
        {
          success: false,
          error: 'RATE_LIMITED',
          message: '24시간에 한 번만 좋아요를 누를 수 있습니다.',
          nextAvailableAt: new Date(existingLike.likedAt.getTime() + 24 * 60 * 60 * 1000).toISOString()
        },
        { status: 429 }
      );
    }

    /**
     * ObjectId 변환 시도
     *
     * @troubleshooting MongoDB findOneAndUpdate는 { value: document } 형태로 반환
     */
    let examiner;
    try {
      const result = await db.collection('expert-examiners').findOneAndUpdate(
        { _id: new ObjectId(examinerId) },
        { $inc: { likes: 1 } },
        { returnDocument: 'after', projection: { likes: 1 } }
      );
      examiner = result?.value || result;
    } catch (error) {
      // ObjectId 변환 실패 시 문자열로 검색
      const result = await db.collection('expert-examiners').findOneAndUpdate(
        { _id: examinerId },
        { $inc: { likes: 1 } },
        { returnDocument: 'after', projection: { likes: 1 } }
      );
      examiner = result?.value || result;
    }

    if (!examiner) {
      return NextResponse.json(
        { success: false, error: 'Examiner not found' },
        { status: 404 }
      );
    }

    /**
     * 좋아요 기록 저장
     *
     * @purpose IP별 좋아요 기록을 DB에 저장하여 24시간 제한 추적
     * @note likedAt에 인덱스 추가 권장 (자동 만료 처리 가능)
     */
    await db.collection('examiner-likes').insertOne({
      examinerId,
      ip,
      likedAt: new Date(),
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      likes: examiner.likes || 0,
    });
  } catch (error) {
    console.error('Failed to like examiner:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
