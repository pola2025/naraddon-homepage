import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import clientPromise from '@/lib/mongodb-client';

/**
 * PATCH /api/examiner/brand-page
 *
 * @purpose 심사관 브랜드 페이지 정보 업데이트
 * @context 회사소개, 경력, 성공케이스 등 편집 후 저장
 * @decision
 *   - 세션 검증 후 본인의 브랜드 페이지만 수정 가능
 *   - brandPage 필드 전체를 업데이트
 *   - XSS 방지를 위해 HTML sanitize (향후 고려)
 */
export async function PATCH(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 심사관 권한 확인
    if (session.user.role !== 'examiner' && session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Examiner role required' },
        { status: 403 }
      );
    }

    // 요청 body 파싱
    const body = await request.json();
    const { brandPage } = body;

    if (!brandPage) {
      return NextResponse.json(
        { success: false, error: 'Brand page data is required' },
        { status: 400 }
      );
    }

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    // 심사관 조회
    const examiner = await db.collection('expert-examiners').findOne({
      email: session.user.email,
    });

    if (!examiner) {
      return NextResponse.json(
        { success: false, error: 'Examiner not found' },
        { status: 404 }
      );
    }

    // brandPage 업데이트
    const result = await db.collection('expert-examiners').updateOne(
      { _id: examiner._id },
      {
        $set: {
          brandPage: {
            companyLogo: brandPage.companyLogo || '',
            companyIntro: brandPage.companyIntro || '',
            useDefaultIntro: brandPage.useDefaultIntro ?? true,
            infoImage: brandPage.infoImage || '',
            careers: brandPage.careers || [],
            successCases: brandPage.successCases || [],
            contactInfo: brandPage.contactInfo || {
              website: '',
              consultationHours: '',
              address: '',
            },
          },
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      console.warn('[Brand Page API] No documents modified');
    }

    console.log('[Brand Page API] Updated successfully:', examiner._id);

    return NextResponse.json({
      success: true,
      message: 'Brand page updated successfully',
    });
  } catch (error) {
    console.error('[Brand Page API] Update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
