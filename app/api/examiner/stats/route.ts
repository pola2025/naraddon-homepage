import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth-options';
import clientPromise from '@/lib/mongodb-client';
import connectDB from '@/lib/mongodb';
import ExpertExaminer from '@/models/ExpertExaminer';

export const dynamic = 'force-dynamic';

/**
 * GET /api/examiner/stats - 심사관 상담관리 통계
 *
 * @purpose 기업심사관의 상담 활동 통계 제공
 * @context 심사관은 자신에게 배정된 상담의 현황을 실시간으로 확인
 *          관리자는 examinerEmail 파라미터로 특정 심사관의 통계 조회 가능
 * @query examinerEmail - (관리자 전용) 조회할 심사관의 이메일
 * @returns 배정된 상담, 완료 상담, 검토 대기, 평균 평점, 최근 상담 목록
 */
export async function GET(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    console.log('[Examiner Stats API] Session:', session ? { email: session.user?.email } : 'NO SESSION');

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 심사관 권한 확인 (examiner 또는 admin)
    const userRole = (session.user as any)?.role;
    const userEmail = session.user?.email;

    console.log('[Examiner Stats API] User role:', userRole);
    console.log('[Examiner Stats API] User email:', userEmail);

    if (userRole !== 'examiner' && userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({
        error: 'Forbidden - Examiner access required',
        debug: {
          userEmail: session.user?.email,
          userRole: userRole,
          requiredRoles: ['examiner', 'admin', 'super_admin']
        }
      }, { status: 403 });
    }

    // 조회할 심사관 이메일 결정
    // 관리자는 URL 파라미터로 특정 심사관 조회 가능
    const { searchParams } = new URL(request.url);
    const requestedExaminerEmail = searchParams.get('examinerEmail');

    let targetEmail = userEmail;
    let targetExaminerId = (session.user as any)?.examinerId; // 🔥 세션의 examinerId

    // 관리자가 특정 심사관의 데이터를 요청한 경우
    if (requestedExaminerEmail && (userRole === 'admin' || userRole === 'super_admin')) {
      targetEmail = requestedExaminerEmail;
      targetExaminerId = null; // 다른 심사관이므로 email로 조회
      console.log('[Examiner Stats API] Admin requesting stats for:', targetEmail);
    } else if (requestedExaminerEmail && userRole === 'examiner') {
      // 심사관은 다른 심사관의 데이터를 조회할 수 없음
      return NextResponse.json({
        error: 'Forbidden - Examiners can only view their own stats'
      }, { status: 403 });
    }

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');
    const consultationsCollection = db.collection('consultations');

    /**
     * ExpertExaminer ID 조회 (브랜드 페이지 링크용)
     *
     * @purpose 심사관 대시보드에서 브랜드 페이지 링크 표시
     * @decision
     *   - 본인 조회: 세션의 examinerId 사용 (DB 조회 불필요, 일관성 보장)
     *   - 관리자가 다른 심사관 조회: email로 검색
     */
    await connectDB();
    let expertExaminer;

    if (targetExaminerId && userRole === 'examiner') {
      // 🔥 본인 조회: 세션의 examinerId로 직접 조회 (DB 조회 1회, 일관성 보장)
      const { ObjectId } = require('mongodb');
      expertExaminer = await ExpertExaminer.findById(new ObjectId(targetExaminerId));
      console.log('[Examiner Stats API] Using cached examinerId from session:', targetExaminerId);
    } else {
      // 관리자가 다른 심사관 조회: email로 검색
      expertExaminer = await ExpertExaminer.findOne({ email: targetEmail });
      console.log('[Examiner Stats API] Querying by email:', targetEmail);
    }

    // 활동 점수 조회
    let activityScore = 0;
    let activityDetails = null;

    if (expertExaminer) {
      const activities = await db.collection('examiner-activities').findOne({
        examinerId: expertExaminer._id.toString()
      });

      if (activities) {
        /**
         * 점수 계산
         *
         * @purpose 각 활동 타입별 점수 가중치 적용
         * @context profileCompletenessScore는 완성도 점수 (0~30점)를 그대로 반영
         * @decision 상담 점수 상향 (배정 40점, 완료 80점) - 고가치 활동 우대
         */
        const scoreConfig = {
          pageVisit: 1,
          postCreated: 10,
          commentCreated: 5,
          consultationAssigned: 40,
          consultationCompleted: 80,
          login: 2
        };

        // 실시간 상담 통계 (consultations 컬렉션에서 조회)
        const consultationsAssigned = await consultationsCollection.countDocuments({
          assignedStaffId: targetEmail
        });
        const consultationsCompleted = await consultationsCollection.countDocuments({
          assignedStaffId: targetEmail,
          status: 'completed'
        });

        activityScore =
          (activities.activities.pageVisits * scoreConfig.pageVisit) +
          (activities.activities.postsCreated * scoreConfig.postCreated) +
          (activities.activities.commentsCreated * scoreConfig.commentCreated) +
          (consultationsAssigned * scoreConfig.consultationAssigned) +
          (consultationsCompleted * scoreConfig.consultationCompleted) +
          (activities.activities.loginCount * scoreConfig.login) +
          (activities.activities.profileCompletenessScore || 0);

        activityDetails = {
          pageVisits: activities.activities.pageVisits,
          postsCreated: activities.activities.postsCreated,
          commentsCreated: activities.activities.commentsCreated,
          loginCount: activities.activities.loginCount,
          profileCompletenessScore: activities.activities.profileCompletenessScore || 0
        };
      }
    }

    // 병렬로 통계 데이터 수집 (targetEmail로 조회)
    const [
      assignedConsultations,
      completedConsultations,
      pendingReviews,
      recentConsultations
    ] = await Promise.all([
      // 배정된 상담 수 (배정됨 + 진행중)
      consultationsCollection.countDocuments({
        assignedStaffId: targetEmail,
        status: { $in: ['assigned', 'in_progress'] }
      }),

      // 완료된 상담 수
      consultationsCollection.countDocuments({
        assignedStaffId: targetEmail,
        status: 'completed'
      }),

      // 검토 대기 상담 수
      consultationsCollection.countDocuments({
        assignedStaffId: targetEmail,
        status: 'review'
      }),

      // 최근 상담 목록 (5건)
      consultationsCollection
        .find({ assignedStaffId: targetEmail })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray()
    ]);

    // 평균 평점 계산 (rating 필드가 있는 경우)
    const ratingsResult = await consultationsCollection.aggregate([
      {
        $match: {
          assignedStaffId: targetEmail,
          rating: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' }
        }
      }
    ]).toArray();

    const averageRating = ratingsResult.length > 0
      ? Math.round(ratingsResult[0].averageRating * 10) / 10
      : 0;

    // 최근 상담 데이터 변환
    const formattedConsultations = recentConsultations.map(consultation => ({
      id: consultation._id.toString(),
      clientName: consultation.userName || '알 수 없음',
      companyName: consultation.companyName || '-',
      consultationType: consultation.consultationType || '일반 상담',
      status: consultation.status || 'pending',
      scheduledDate: consultation.preferredDate
        ? new Date(consultation.preferredDate).toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })
        : new Date(consultation.createdAt).toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }),
      amount: consultation.annualRevenue || undefined
    }));

    return NextResponse.json({
      assignedConsultations,
      completedConsultations,
      pendingReviews,
      averageRating,
      recentConsultations: formattedConsultations,
      examinerId: expertExaminer?._id?.toString() || null,
      activityScore,
      activityDetails
    });
  } catch (error) {
    console.error('Examiner stats error:', error);

    // MongoDB 연결 실패 시 기본값 반환
    return NextResponse.json({
      assignedConsultations: 0,
      completedConsultations: 0,
      pendingReviews: 0,
      averageRating: 0,
      recentConsultations: [],
      notice: 'MongoDB 연결 대기 중입니다. 잠시 후 새로고침해주세요.'
    });
  }
}
