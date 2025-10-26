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

    /**
     * 세션 확인 (필수)
     *
     * @security CRITICAL - 모든 요청에 세션 필요
     * @purpose 인증되지 않은 사용자의 접근 차단
     */
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    let targetExaminer;

    /**
     * 권한 분기 처리
     *
     * @case1 examinerId가 있는 경우 (다른 심사관 수정)
     *   - 관리자만 가능 (admin, super_admin)
     *   - 일반 심사관은 다른 심사관 수정 불가
     *
     * @case2 examinerId가 없는 경우 (본인 수정)
     *   - examiner 또는 admin 권한 필요
     *   - 본인의 브랜드 페이지만 수정
     */
    if (examinerId) {
      // 관리자 권한 확인 (다른 심사관 수정은 관리자만)
      if (session.user.role !== 'admin' && session.user.role !== 'super_admin') {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Admin access required to edit other examiners' },
          { status: 403 }
        );
      }

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
      // 심사관 권한 확인 (본인 수정)
      if (session.user.role !== 'examiner' && session.user.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Examiner role required' },
          { status: 403 }
        );
      }

      /**
       * 심사관 조회 전략 (2단계 fallback)
       *
       * @strategy1 세션의 examinerId 사용 (최우선, 가장 빠름)
       * @strategy2 email OR userId로 조회 (fallback, 기존 세션 대응)
       * @purpose 네이버 로그인 프로세스 보호하면서 기존 세션도 지원
       */
      const { ObjectId } = require('mongodb');

      if (session.user.examinerId) {
        // 🔥 전략1: 세션의 examinerId로 직접 조회 (1회 조회, 일관성 보장)
        targetExaminer = await db.collection('expert-examiners').findOne({
          _id: new ObjectId(session.user.examinerId),
        });
        console.log('[Brand Page API] Using cached examinerId from session:', session.user.examinerId);
      }

      if (!targetExaminer) {
        // 🔥 전략2: email OR userId로 조회 (기존 세션 fallback)
        const userId = session.user.id;
        const query = userId
          ? { $or: [{ email: session.user.email }, { userId }] }
          : { email: session.user.email };

        targetExaminer = await db.collection('expert-examiners').findOne(query);
        console.log('[Brand Page API] Fallback query by email/userId:', { email: session.user.email, userId, found: !!targetExaminer });
      }

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
     * 프로필 완성도 점수 계산 및 기록
     *
     * @purpose examiner의 브랜드 페이지 완성도를 점수로 환산
     * @context 각 항목 완성 여부로 점수 부여 (횟수 기반 X)
     * @decision
     *   - companyLogo: 5점 (로고 이미지 있음)
     *   - companyIntro: 5점 (회사 소개 작성)
     *   - infoImage: 5점 (정보 이미지 있음)
     *   - careers: 5점 (경력 1개 이상)
     *   - successCases: 5점 (성공 케이스 1개 이상)
     *   - contactInfo: 5점 (연락처 정보 1개 이상)
     *   - 최대 30점
     * @note 관리자가 편집한 경우는 기록하지 않음 (examinerId가 있는 경우)
     */
    if (!examinerId && result.modifiedCount > 0) {
      try {
        const targetExaminerId = targetExaminer._id.toString();

        // 브랜드 페이지 완성도 계산
        let completenessScore = 0;

        // 1. 회사 로고 (5점)
        if (brandPage.companyLogo && brandPage.companyLogo.trim()) {
          completenessScore += 5;
        }

        // 2. 회사 소개 (5점)
        if (brandPage.companyIntro && brandPage.companyIntro.trim()) {
          completenessScore += 5;
        }

        // 3. 정보 이미지 (5점)
        if (brandPage.infoImage && brandPage.infoImage.trim()) {
          completenessScore += 5;
        }

        // 4. 경력 (5점)
        if (brandPage.careers && brandPage.careers.length > 0) {
          completenessScore += 5;
        }

        // 5. 성공 케이스 (5점)
        if (brandPage.successCases && brandPage.successCases.length > 0) {
          completenessScore += 5;
        }

        // 6. 연락처 정보 (5점)
        if (brandPage.contactInfo && (
          (brandPage.contactInfo.website && brandPage.contactInfo.website.trim()) ||
          (brandPage.contactInfo.consultationHours && brandPage.contactInfo.consultationHours.trim()) ||
          (brandPage.contactInfo.address && brandPage.contactInfo.address.trim())
        )) {
          completenessScore += 5;
        }

        // 완성도 점수 저장 (횟수가 아닌 완성도)
        await fetch(`${process.env.NEXTAUTH_URL}/api/admin/examiners/${targetExaminerId}/activities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activityType: 'profileCompleteness',
            completenessScore
          })
        });

        console.log(`[Brand Page API] Profile completeness recorded for ${targetExaminer.name}: ${completenessScore}/30점`);
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
