import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/certified-examiners - 공개된 심사관 목록 조회
 *
 * @purpose 프론트엔드에서 표시할 공개 심사관 목록 제공
 * @context isPublished=true인 심사관만 반환
 * @security 인증 불필요 (공개 API)
 * @returns 심사관 이름, 회사명, 이미지 URL
 */
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('naraddon');

    // isPublished=true인 심사관만 조회
    const examiners = await db.collection('expert-examiners')
      .find({ isPublished: true })
      .project({
        name: 1,
        companyName: 1,
        imageUrl: 1,
        position: 1,
        category: 1,
        specialties: 1
      })
      .toArray();

    // 프론트엔드 형식으로 변환
    const formattedExaminers = examiners.map(examiner => ({
      name: examiner.name,
      company: examiner.companyName,
      imageUrl: examiner.imageUrl || '',
      position: examiner.position || '인증 기업심사관',
      category: examiner.category || 'funding',
      specialties: examiner.specialties || []
    }));

    return NextResponse.json({
      success: true,
      examiners: formattedExaminers,
      total: formattedExaminers.length
    });
  } catch (error) {
    console.error('[Certified Examiners API] Error:', error);
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
