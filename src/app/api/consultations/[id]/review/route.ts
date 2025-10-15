import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { ConsultationReview } from '@/types/review.types';

// GET /api/consultations/[id]/review - 리뷰 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    const userEmail = session.user?.email;

    const client = await clientPromise;
    const db = client.db('naraddon');

    // 상담 정보 조회
    const consultationId = new ObjectId(params.id);
    const consultation = await db.collection('consultations').findOne({ _id: consultationId });

    if (!consultation) {
      return NextResponse.json({ error: '상담을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 권한 체크
    if (userRole === 'admin' || userRole === 'super_admin') {
      // 관리자는 모든 리뷰 조회 가능
      const reviews = await db.collection('reviews')
        .find({ consultationId: params.id })
        .toArray();
      return NextResponse.json(reviews);
    } else if (userRole === 'examiner' && consultation.assignedStaffId === userEmail) {
      // 기업심사관은 자신에 대한 리뷰 조회 불가
      return NextResponse.json({ error: '본인에 대한 리뷰는 조회할 수 없습니다.' }, { status: 403 });
    } else if (consultation.userEmail === userEmail) {
      // 일반 사용자는 자신이 작성한 리뷰가 있는지만 확인 (내용은 보이지 않음)
      const hasReviewed = await db.collection('reviews').findOne({
        consultationId: params.id,
        reviewerEmail: userEmail
      });
      return NextResponse.json({ hasReviewed: !!hasReviewed });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error('Failed to fetch review:', error);
    return NextResponse.json(
      { error: '리뷰 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST /api/consultations/[id]/review - 리뷰 작성
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user?.email;
    const data = await request.json();

    const client = await clientPromise;
    const db = client.db('naraddon');

    // 상담 정보 조회
    const consultationId = new ObjectId(params.id);
    const consultation = await db.collection('consultations').findOne({ _id: consultationId });

    if (!consultation) {
      return NextResponse.json({ error: '상담을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 권한 체크 - 해당 상담의 고객만 리뷰 작성 가능
    if (consultation.userEmail !== userEmail) {
      return NextResponse.json(
        { error: '본인의 상담에 대해서만 리뷰를 작성할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 상태 체크 - 계약 완료 상태에서만 리뷰 작성 가능
    if (consultation.status !== 'contracted' && consultation.status !== 'completed') {
      return NextResponse.json(
        { error: '계약이 완료된 상담에 대해서만 리뷰를 작성할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 중복 리뷰 체크
    const existingReview = await db.collection('reviews').findOne({
      consultationId: params.id,
      reviewerEmail: userEmail
    });

    if (existingReview) {
      return NextResponse.json(
        { error: '이미 리뷰를 작성하셨습니다.' },
        { status: 400 }
      );
    }

    // 담당 심사관 정보
    const examiner = await db.collection('users').findOne({
      email: consultation.assignedStaffId
    });

    if (!examiner) {
      return NextResponse.json(
        { error: '담당 심사관 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 리뷰 생성
    const review: ConsultationReview = {
      consultationId: params.id,
      examinerId: consultation.assignedStaffId,
      examinerName: consultation.assignedStaffName || examiner.name,
      reviewerId: userEmail || '',
      reviewerName: session.user?.name || '',
      reviewerEmail: userEmail || '',
      ratings: data.ratings,
      averageRating: data.averageRating,
      review: data.review,
      wouldRecommend: data.wouldRecommend,
      createdAt: new Date(),
      status: 'submitted'
    };

    // 리뷰 저장
    const result = await db.collection('reviews').insertOne(review);

    // 심사관 통계 업데이트
    await updateExaminerStats(db, consultation.assignedStaffId);

    // 상담에 리뷰 완료 플래그 추가
    await db.collection('consultations').updateOne(
      { _id: consultationId },
      { $set: { hasReviewed: true } }
    );

    return NextResponse.json({
      success: true,
      reviewId: result.insertedId,
      message: '리뷰가 성공적으로 등록되었습니다.'
    });
  } catch (error) {
    console.error('Failed to create review:', error);
    return NextResponse.json(
      { error: '리뷰 작성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 심사관 통계 업데이트 함수
async function updateExaminerStats(db: any, examinerId: string) {
  try {
    // 해당 심사관의 모든 리뷰 조회
    const reviews = await db.collection('reviews')
      .find({ examinerId })
      .toArray();

    if (reviews.length === 0) return;

    // 평균 계산
    const avgRatings = {
      professionalism: 0,
      communication: 0,
      responsiveness: 0,
      problemSolving: 0,
      satisfaction: 0,
      overall: 0
    };

    reviews.forEach((review: any) => {
      avgRatings.professionalism += review.ratings.professionalism;
      avgRatings.communication += review.ratings.communication;
      avgRatings.responsiveness += review.ratings.responsiveness;
      avgRatings.problemSolving += review.ratings.problemSolving;
      avgRatings.satisfaction += review.ratings.satisfaction;
      avgRatings.overall += review.averageRating;
    });

    Object.keys(avgRatings).forEach(key => {
      avgRatings[key as keyof typeof avgRatings] =
        avgRatings[key as keyof typeof avgRatings] / reviews.length;
    });

    // 추천율 계산
    const recommendCount = reviews.filter((r: any) => r.wouldRecommend).length;
    const recommendationRate = (recommendCount / reviews.length) * 100;

    // 심사관 프로필 업데이트
    await db.collection('users').updateOne(
      { email: examinerId },
      {
        $set: {
          'examinerProfile.averageRatings': avgRatings,
          'examinerProfile.totalReviews': reviews.length,
          'examinerProfile.recommendationRate': recommendationRate,
          'examinerProfile.lastReviewedAt': new Date()
        }
      }
    );
  } catch (error) {
    console.error('Failed to update examiner stats:', error);
  }
}