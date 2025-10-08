import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth-options';
import clientPromise from '@/lib/mongodb-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/examiner/stats - 심사관 대시보드 통계
 *
 * @purpose 기업심사관의 상담 활동 통계 제공
 * @context 심사관은 자신에게 배정된 상담의 현황을 실시간으로 확인
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

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');
    const consultationsCollection = db.collection('consultations');

    // 병렬로 통계 데이터 수집
    const [
      assignedConsultations,
      completedConsultations,
      pendingReviews,
      recentConsultations
    ] = await Promise.all([
      // 배정된 상담 수 (현재 진행 중인 상담)
      consultationsCollection.countDocuments({
        assignedStaffId: userEmail,
        status: { $in: ['pending', 'in_progress'] }
      }),

      // 완료된 상담 수
      consultationsCollection.countDocuments({
        assignedStaffId: userEmail,
        status: 'completed'
      }),

      // 검토 대기 상담 수
      consultationsCollection.countDocuments({
        assignedStaffId: userEmail,
        status: 'review'
      }),

      // 최근 상담 목록 (5건)
      consultationsCollection
        .find({ assignedStaffId: userEmail })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray()
    ]);

    // 평균 평점 계산 (rating 필드가 있는 경우)
    const ratingsResult = await consultationsCollection.aggregate([
      {
        $match: {
          assignedStaffId: userEmail,
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
      recentConsultations: formattedConsultations
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
