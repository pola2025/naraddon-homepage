import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';

export const dynamic = 'force-dynamic';

// 캐시 설정: 5분간 유효
export const revalidate = 300;

/**
 * GET /api/certified-examiners - 공개된 심사관 목록 조회
 *
 * @purpose 프론트엔드에서 표시할 공개 심사관 목록 제공
 * @context isPublished=true인 심사관만 반환
 * @security 인증 불필요 (공개 API)
 * @returns 심사관 이름, 회사명, 이미지 URL
 * @performance 인덱스 사용, 5분 캐싱
 */
export async function GET() {
  const startTime = Date.now();

  try {
    const client = await clientPromise;
    const db = client.db('naraddon');

    // 성능 모니터링: DB 연결 시간
    const dbConnectTime = Date.now() - startTime;
    console.log(`[Certified Examiners API] DB connect: ${dbConnectTime}ms`);

    // isPublished=true인 심사관만 조회 (인덱스 사용)
    const queryStartTime = Date.now();
    const examiners = await db.collection('expert-examiners')
      .find({ isPublished: true })
      .project({
        name: 1,
        companyName: 1,
        imageUrl: 1,
        position: 1,
        category: 1,
        specialties: 1,
        sortOrder: 1,
        isPublished: 1
      })
      .toArray();

    const queryTime = Date.now() - queryStartTime;
    console.log(`[Certified Examiners API] Query: ${queryTime}ms`);

    // 프론트엔드 형식으로 변환 (MongoDB 문서 형식 유지)
    const formattedExaminers = examiners.map(examiner => ({
      _id: examiner._id.toString(),
      name: examiner.name,
      companyName: examiner.companyName,
      imageUrl: examiner.imageUrl || '',
      position: examiner.position || '인증 기업심사관',
      category: examiner.category || 'funding',
      specialties: examiner.specialties || [],
      isPublished: true,
      sortOrder: examiner.sortOrder || 0
    }));

    const totalTime = Date.now() - startTime;
    console.log(`[Certified Examiners API] Total: ${totalTime}ms, Count: ${formattedExaminers.length}`);

    return NextResponse.json(
      {
        success: true,
        examiners: formattedExaminers,
        total: formattedExaminers.length
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('[Certified Examiners API] Error:', error);
    const totalTime = Date.now() - startTime;
    console.error(`[Certified Examiners API] Failed after ${totalTime}ms`);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch examiners',
        examiners: []
      },
      { status: 500 }
    );
  }
}
