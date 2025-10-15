import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { ConsultationStatus } from '@/types/consultation.types';
import { AdminLogger } from '@/lib/admin-logger';

// PUT /api/consultations/[id]/assign - 상담 배정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;

    // 관리자만 배정 가능
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { staffId, staffName, notes } = await request.json();

    if (!staffId) {
      return NextResponse.json(
        { error: '담당자를 선택해주세요.' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('naraddon');

    // 상담 정보 조회
    const consultationId = new ObjectId(params.id);
    const consultation = await db.collection('consultations').findOne({ _id: consultationId });

    if (!consultation) {
      return NextResponse.json({ error: '상담을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 담당자 정보 확인
    const staff = await db.collection('users').findOne({ email: staffId });
    const validRoles = ['expert', 'examiner'];

    if (!staff || !validRoles.includes(staff.role)) {
      return NextResponse.json(
        {
          error: '유효하지 않은 담당자입니다.',
          debug: {
            staffRole: staff?.role,
            validRoles
          }
        },
        { status: 400 }
      );
    }

    // 상담 배정 업데이트
    const updateResult = await db.collection('consultations').updateOne(
      { _id: consultationId },
      {
        $set: {
          assignedStaffId: staffId,
          assignedStaffName: staffName || staff.name || staff.email,
          assignedBy: session.user?.email,
          assignedAt: new Date(),
          status: ConsultationStatus.ASSIGNED,
          updatedAt: new Date()
        },
        $push: {
          history: {
            action: 'assigned',
            performedBy: session.user?.email,
            performedAt: new Date(),
            details: {
              assignedTo: staffId,
              notes
            }
          }
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json(
        { error: '상담 배정에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 관리자 활동 로그
    await AdminLogger.logUpdate(
      'consultation',
      params.id,
      {
        action: 'assign',
        assignedTo: staffId,
        previousStatus: consultation.status,
        newStatus: ConsultationStatus.ASSIGNED
      }
    );

    // 담당자에게 알림 생성
    await db.collection('notifications').insertOne({
      userId: staffId,
      type: 'consultation_assigned',
      title: '새로운 상담이 배정되었습니다',
      message: `${consultation.userName}님의 상담이 배정되었습니다.`,
      consultationId: params.id,
      read: false,
      createdAt: new Date()
    });

    // TODO: 이메일/SMS 알림 발송

    return NextResponse.json({
      success: true,
      message: `상담이 ${staffName || staff.name}님에게 배정되었습니다.`
    });
  } catch (error) {
    console.error('Failed to assign consultation:', error);
    return NextResponse.json(
      { error: '상담 배정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}