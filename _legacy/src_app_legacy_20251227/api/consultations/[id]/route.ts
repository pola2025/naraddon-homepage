import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

// GET /api/consultations/[id] - 상담 상세 조회
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

    // 상담 조회
    let consultation;
    try {
      const consultationId = new ObjectId(params.id);
      consultation = await db.collection('consultations').findOne({ _id: consultationId });
    } catch (error) {
      // ObjectId 변환 실패 시 ID로 조회
      consultation = await db.collection('consultations').findOne({ id: params.id });
    }

    if (!consultation) {
      return NextResponse.json({ error: '상담을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 권한 확인
    const userRole = (session.user as any)?.role;
    const userEmail = session.user?.email;

    // 관리자, 배정된 담당자, 또는 신청자 본인만 조회 가능
    if (
      userRole !== 'admin' &&
      userRole !== 'super_admin' &&
      consultation.assignedStaffId !== userEmail &&
      consultation.userEmail !== userEmail
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(consultation);
  } catch (error) {
    console.error('Failed to fetch consultation:', error);
    return NextResponse.json(
      { error: '상담 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT /api/consultations/[id] - 상담 정보 수정
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

    const data = await request.json();

    const client = await clientPromise;
    const db = client.db('naraddon');

    // 상담 조회
    const consultationId = new ObjectId(params.id);
    const consultation = await db.collection('consultations').findOne({ _id: consultationId });

    if (!consultation) {
      return NextResponse.json({ error: '상담을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 권한 확인: 관리자 또는 배정된 담당자만 수정 가능
    if (
      userRole !== 'admin' &&
      userRole !== 'super_admin' &&
      consultation.assignedStaffId !== userEmail
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 업데이트 데이터 준비 (허용된 필드만)
    const allowedFields = [
      'preferredDate',
      'preferredTime',
      'nextScheduledDate',
      'annualRevenue',
      'employeeCount',
      'message'
    ];

    const updateData: any = {
      updatedAt: new Date()
    };

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    // 상담 업데이트
    const updateResult = await db.collection('consultations').updateOne(
      { _id: consultationId },
      {
        $set: updateData,
        $push: {
          history: {
            action: 'info_update',
            performedBy: session.user?.email,
            performedAt: new Date(),
            details: { updatedFields: Object.keys(updateData) }
          }
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json(
        { error: '상담 정보 수정에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '상담 정보가 수정되었습니다.'
    });
  } catch (error) {
    console.error('Failed to update consultation:', error);
    return NextResponse.json(
      { error: '상담 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE /api/consultations/[id] - 상담 취소/삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;

    // 관리자만 삭제 가능
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { reason } = await request.json();

    const client = await clientPromise;
    const db = client.db('naraddon');

    const consultationId = new ObjectId(params.id);

    // Soft delete - 상태를 cancelled로 변경
    const updateResult = await db.collection('consultations').updateOne(
      { _id: consultationId },
      {
        $set: {
          status: 'cancelled',
          cancelledBy: session.user?.email,
          cancelledAt: new Date(),
          cancelReason: reason,
          updatedAt: new Date()
        },
        $push: {
          history: {
            action: 'cancelled',
            performedBy: session.user?.email,
            performedAt: new Date(),
            details: { reason }
          }
        }
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: '상담을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '상담이 취소되었습니다.'
    });
  } catch (error) {
    console.error('Failed to cancel consultation:', error);
    return NextResponse.json(
      { error: '상담 취소 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}