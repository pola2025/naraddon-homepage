import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

/**
 * GET /api/certified-examiners/[id]
 *
 * @purpose 개별 심사관 브랜드 페이지 데이터 조회
 * @context 공개된 심사관만 조회 가능 (isPublished: true)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Next.js 14+ compatibility: params can be a Promise
    const params = await Promise.resolve(context.params);
    const examinerId = params.id;

    console.log('[Brand Page API] Fetching examiner:', examinerId);

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    /**
     * ObjectId 변환 시도 및 조회수 증가
     *
     * @troubleshooting MongoDB findOneAndUpdate는 { value: document } 형태로 반환
     * returnDocument: 'after' 옵션 사용해도 .value 접근 필요
     */
    let examiner;
    try {
      // findOneAndUpdate로 조회수를 증가시키면서 조회
      const result = await db.collection('expert-examiners').findOneAndUpdate(
        { _id: new ObjectId(examinerId) },
        { $inc: { views: 1 } },
        { returnDocument: 'after' }
      );
      examiner = result?.value || result; // .value 또는 직접 document
    } catch (error) {
      // ObjectId 변환 실패 시 문자열로 검색
      const result = await db.collection('expert-examiners').findOneAndUpdate(
        { _id: examinerId },
        { $inc: { views: 1 } },
        { returnDocument: 'after' }
      );
      examiner = result?.value || result;
    }

    console.log('[Brand Page API] Query result:', examiner ? 'Found' : 'Not found');

    if (!examiner) {
      return NextResponse.json(
        { success: false, error: 'Examiner not found' },
        { status: 404 }
      );
    }

    // 비공개 심사관은 조회 불가
    if (!examiner.isPublished) {
      return NextResponse.json(
        { success: false, error: 'Examiner not published' },
        { status: 403 }
      );
    }

    // 정책분석 글 개수 조회
    let policyAnalysisCount = 0;

    // legacyKey 또는 이름으로 매칭 시도
    const policyQuery: any = { $or: [] };

    if (examiner.legacyKey) {
      policyQuery.$or.push({ 'examiner.key': examiner.legacyKey });
    }

    if (examiner.name) {
      policyQuery.$or.push({ 'examiner.name': examiner.name });
    }

    if (policyQuery.$or.length > 0) {
      policyAnalysisCount = await db.collection('policyanalysisposts').countDocuments(policyQuery);
      console.log('[Brand Page API] Policy analysis count for', examiner.name, ':', policyAnalysisCount);
    }

    return NextResponse.json({
      success: true,
      examiner: {
        _id: examiner._id.toString(),
        name: examiner.name,
        legacyKey: examiner.legacyKey,
        position: examiner.position,
        companyName: examiner.companyName,
        category: examiner.category,
        specialties: examiner.specialties || [],
        imageUrl: examiner.imageUrl,
        imageAlt: examiner.imageAlt,
        headline: examiner.headline,
        bio: examiner.bio,
        profileHighlights: examiner.profileHighlights || [],
        focusAreas: examiner.focusAreas || [],
        brandPage: examiner.brandPage || {
          useDefaultIntro: true,
          careers: [],
          successCases: [],
          contactInfo: {},
        },
        views: examiner.views || 0,
        likes: examiner.likes || 0,
        policyAnalysisCount,
      },
    });
  } catch (error) {
    console.error('Failed to fetch examiner:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
