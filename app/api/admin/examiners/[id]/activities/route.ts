import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

// GET /api/admin/examiners/[id]/activities - 심사관 활동점수 조회 (관리자 전용)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    // 현재 로그인한 사용자의 role을 DB에서 확인
    const currentUser = await db.collection('users').findOne({ email: session.user?.email });
    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    const userRole = currentUser.role;

    // 관리자만 접근 가능
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({
        error: 'Forbidden - Admin access required'
      }, { status: 403 });
    }

    const examinerId = params.id;

    // 심사관 확인
    const examiner = await db.collection('expert-examiners').findOne({ _id: new ObjectId(examinerId) });
    if (!examiner) {
      return NextResponse.json({ error: 'Examiner not found' }, { status: 404 });
    }

    // 활동점수 조회 (없으면 기본값 반환)
    let activities = await db.collection('examiner-activities').findOne({ examinerId });

    if (!activities) {
      // 기본 활동점수 생성
      activities = {
        examinerId,
        userId: examiner.userId,
        activities: {
          pageVisits: 0,
          postsCreated: 0,
          commentsCreated: 0,
          consultationsAssigned: 0,
          consultationsCompleted: 0,
          loginCount: 0,
          profileUpdates: 0,
          lastActiveAt: null
        },
        totalScore: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    // 실시간 통계 계산
    const stats = {
      // 상담 배정 수
      consultationsAssigned: examiner.userId
        ? await db.collection('consultations').countDocuments({ assignedStaffId: examiner.userId })
        : 0,
      // 상담 완료 수
      consultationsCompleted: examiner.userId
        ? await db.collection('consultations').countDocuments({
            assignedStaffId: examiner.userId,
            status: 'completed'
          })
        : 0,
    };

    // 점수 계산
    const scoreConfig = {
      pageVisit: 1,
      postCreated: 10,
      commentCreated: 5,
      consultationAssigned: 15,
      consultationCompleted: 20,
      login: 2,
      profileUpdate: 5
    };

    const calculatedScore =
      (activities.activities.pageVisits * scoreConfig.pageVisit) +
      (activities.activities.postsCreated * scoreConfig.postCreated) +
      (activities.activities.commentsCreated * scoreConfig.commentCreated) +
      (stats.consultationsAssigned * scoreConfig.consultationAssigned) +
      (stats.consultationsCompleted * scoreConfig.consultationCompleted) +
      (activities.activities.loginCount * scoreConfig.login) +
      ((activities.activities.profileUpdates || 0) * scoreConfig.profileUpdate);

    return NextResponse.json({
      examinerId,
      examinerName: examiner.name,
      activities: {
        pageVisits: activities.activities.pageVisits,
        postsCreated: activities.activities.postsCreated,
        commentsCreated: activities.activities.commentsCreated,
        consultationsAssigned: stats.consultationsAssigned,
        consultationsCompleted: stats.consultationsCompleted,
        loginCount: activities.activities.loginCount,
        profileUpdates: activities.activities.profileUpdates || 0,
        lastActiveAt: activities.activities.lastActiveAt
      },
      totalScore: calculatedScore,
      scoreBreakdown: {
        pageVisits: activities.activities.pageVisits * scoreConfig.pageVisit,
        postsCreated: activities.activities.postsCreated * scoreConfig.postCreated,
        commentsCreated: activities.activities.commentsCreated * scoreConfig.commentCreated,
        consultationsAssigned: stats.consultationsAssigned * scoreConfig.consultationAssigned,
        consultationsCompleted: stats.consultationsCompleted * scoreConfig.consultationCompleted,
        loginCount: activities.activities.loginCount * scoreConfig.login,
        profileUpdates: (activities.activities.profileUpdates || 0) * scoreConfig.profileUpdate
      },
      scoreConfig
    });

  } catch (error) {
    console.error('[Examiner Activities API] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/examiners/[id]/activities - 활동점수 기록 (시스템 전용)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const examinerId = params.id;
    const { activityType, increment = 1 } = await request.json();

    // 유효한 활동 타입인지 확인
    const validTypes = ['pageVisit', 'postCreated', 'commentCreated', 'login', 'profileUpdated'];
    if (!validTypes.includes(activityType)) {
      return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('naraddon');

    // 심사관 확인
    const examiner = await db.collection('expert-examiners').findOne({ _id: new ObjectId(examinerId) });
    if (!examiner) {
      return NextResponse.json({ error: 'Examiner not found' }, { status: 404 });
    }

    const now = new Date();

    // 활동 타입에 따른 필드 매핑
    const fieldMap: { [key: string]: string } = {
      pageVisit: 'pageVisits',
      postCreated: 'postsCreated',
      commentCreated: 'commentsCreated',
      login: 'loginCount',
      profileUpdated: 'profileUpdates'
    };

    const field = fieldMap[activityType];

    // upsert 방식으로 활동점수 업데이트
    await db.collection('examiner-activities').updateOne(
      { examinerId },
      {
        $inc: { [`activities.${field}`]: increment },
        $set: {
          userId: examiner.userId,
          'activities.lastActiveAt': now,
          updatedAt: now
        },
        $setOnInsert: {
          examinerId,
          activities: {
            pageVisits: 0,
            postsCreated: 0,
            commentsCreated: 0,
            consultationsAssigned: 0,
            consultationsCompleted: 0,
            loginCount: 0,
            profileUpdates: 0,
            lastActiveAt: now
          },
          totalScore: 0,
          createdAt: now
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Activity recorded'
    });

  } catch (error) {
    console.error('[Examiner Activities API] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to record activity', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
