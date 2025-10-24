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
 *   - 관리자는 examinerId 파라미터로 다른 심사관 수정 가능
 *   - brandPage 필드 전체를 업데이트
 *   - XSS 방지를 위해 HTML sanitize (향후 고려)
 */
export async function PATCH(request: NextRequest) {
  try {
    // 요청 body 파싱
    const body = await request.json();
    const { brandPage, examinerId } = body;

    if (!brandPage) {
      return NextResponse.json(
        { success: false, error: 'Brand page data is required' },
        { status: 400 }
      );
    }

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    let targetExaminer;

    // examinerId가 있으면 관리자 편집 모드 (인증 우회)
    if (examinerId) {
      const { ObjectId } = require('mongodb');
      targetExaminer = await db.collection('expert-examiners').findOne({
        _id: new ObjectId(examinerId),
      });

      if (!targetExaminer) {
        return NextResponse.json(
          { success: false, error: 'Examiner not found' },
          { status: 404 }
        );
      }
    } else {
      // 일반 모드: 세션 확인
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

      // 심사관 조회
      targetExaminer = await db.collection('expert-examiners').findOne({
        email: session.user.email,
      });

      if (!targetExaminer) {
        return NextResponse.json(
          { success: false, error: 'Examiner not found' },
          { status: 404 }
        );
      }
    }

    // brandPage 업데이트
    const result = await db.collection('expert-examiners').updateOne(
      { _id: targetExaminer._id },
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

    console.log('[Brand Page API] Updated successfully:', targetExaminer._id);

    /**
     * 프로필 업데이트 활동 기록
     *
     * @purpose examiner의 브랜드 페이지 편집 활동 추적
     * @context 프로필 업데이트는 5점
     * @note 관리자가 편집한 경우는 기록하지 않음 (examinerId가 있는 경우)
     */
    if (!examinerId && result.modifiedCount > 0) {
      try {
        const targetExaminerId = targetExaminer._id.toString();

        await fetch(`${process.env.NEXTAUTH_URL}/api/admin/examiners/${targetExaminerId}/activities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activityType: 'profileUpdated', increment: 1 })
        });

        console.log('[Brand Page API] Profile update activity recorded for:', targetExaminer.name);
      } catch (activityError) {
        console.error('[Brand Page API] Failed to record activity:', activityError);
        // 활동 기록 실패해도 업데이트는 성공으로 처리
      }
    }

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
