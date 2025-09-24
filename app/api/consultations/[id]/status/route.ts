import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { ConsultationStatus, ConsultationPhase } from '@/types/consultation.types';
import { AdminLogger } from '@/lib/admin-logger';

// PUT /api/consultations/[id]/status - 상담 상태 및 단계 업데이트
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
    const userEmail = session.user?.email;

    const { status, phase, memo, contractInfo, nextSchedule } = await request.json();

    const client = await clientPromise;
    const db = client.db('naraddon');

    // 상담 정보 조회
    const consultationId = new ObjectId(params.id);
    const consultation = await db.collection('consultations').findOne({ _id: consultationId });

    if (!consultation) {
      return NextResponse.json({ error: '상담을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 권한 확인: 관리자 또는 배정된 담당자만 수정 가능
    if (userRole !== 'admin' && userRole !== 'super_admin' && consultation.assignedStaffId !== userEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 업데이트 데이터 준비
    const updateData: any = {
      updatedAt: new Date()
    };

    if (status) updateData.status = status;
    if (phase) updateData.currentPhase = phase;
    if (nextSchedule) updateData.nextScheduledDate = new Date(nextSchedule);

    // 계약 체결인 경우 계약 정보 추가
    if (phase === ConsultationPhase.CONTRACT && contractInfo) {
      updateData.contractInfo = {
        contractDate: new Date(),
        contractAmount: contractInfo.amount,
        contractType: contractInfo.type,
        contractDetails: contractInfo.details,
        contractedBy: session.user?.email
      };
      updateData.status = ConsultationStatus.CONTRACTED;
    }

    // 해피콜 완료인 경우 상담 완료 처리
    if (phase === ConsultationPhase.HAPPY_CALL && status === ConsultationStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    // 메모 추가
    const historyEntry: any = {
      action: 'status_update',
      performedBy: session.user?.email,
      performedAt: new Date(),
      details: {
        previousStatus: consultation.status,
        newStatus: status || consultation.status,
        previousPhase: consultation.currentPhase,
        newPhase: phase || consultation.currentPhase
      }
    };

    if (memo) {
      historyEntry.memo = memo;
    }

    // 상담 업데이트
    const updateResult = await db.collection('consultations').updateOne(
      { _id: consultationId },
      {
        $set: updateData,
        $push: {
          history: historyEntry,
          ...(memo ? { memos: {
            phase: phase || consultation.currentPhase,
            content: memo,
            createdBy: session.user?.email,
            createdAt: new Date()
          }} : {})
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json(
        { error: '상담 상태 업데이트에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 단계별 알림 생성
    if (phase && phase !== consultation.currentPhase) {
      const phaseMessages: Record<ConsultationPhase, string> = {
        [ConsultationPhase.PHONE]: '통화 상담이 시작되었습니다.',
        [ConsultationPhase.MEETING]: '대면 상담이 예정되었습니다.',
        [ConsultationPhase.CONTRACT]: '계약이 체결되었습니다.',
        [ConsultationPhase.HAPPY_CALL]: '해피콜이 완료되었습니다.'
      };

      // 고객에게 알림
      if (consultation.userId) {
        await db.collection('notifications').insertOne({
          userId: consultation.userId,
          type: 'consultation_phase_update',
          title: '상담 진행 상황 업데이트',
          message: phaseMessages[phase as ConsultationPhase],
          consultationId: params.id,
          read: false,
          createdAt: new Date()
        });
      }
    }

    // 관리자 활동 로그
    if (userRole === 'admin' || userRole === 'super_admin') {
      await AdminLogger.logUpdate(
        'consultation',
        params.id,
        {
          action: 'status_update',
          previousStatus: consultation.status,
          newStatus: status,
          previousPhase: consultation.currentPhase,
          newPhase: phase,
          memo
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: '상담 상태가 업데이트되었습니다.',
      consultation: {
        id: params.id,
        status: status || consultation.status,
        phase: phase || consultation.currentPhase
      }
    });
  } catch (error) {
    console.error('Failed to update consultation status:', error);
    return NextResponse.json(
      { error: '상담 상태 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// GET /api/consultations/[id]/status - 상담 상태 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db('naraddon');

    const consultationId = new ObjectId(params.id);
    const consultation = await db.collection('consultations').findOne(
      { _id: consultationId },
      {
        projection: {
          status: 1,
          currentPhase: 1,
          assignedStaffId: 1,
          assignedStaffName: 1,
          history: 1,
          memos: 1,
          contractInfo: 1,
          nextScheduledDate: 1
        }
      }
    );

    if (!consultation) {
      return NextResponse.json({ error: '상담을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 권한 확인
    const userRole = (session.user as any)?.role;
    const userEmail = session.user?.email;

    if (
      userRole !== 'admin' &&
      userRole !== 'super_admin' &&
      consultation.assignedStaffId !== userEmail
    ) {
      // 일반 사용자는 기본 정보만
      return NextResponse.json({
        status: consultation.status,
        currentPhase: consultation.currentPhase
      });
    }

    return NextResponse.json(consultation);
  } catch (error) {
    console.error('Failed to fetch consultation status:', error);
    return NextResponse.json(
      { error: '상담 상태 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}