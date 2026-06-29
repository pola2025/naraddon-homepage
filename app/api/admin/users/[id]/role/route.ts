import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth-options';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

// PUT /api/admin/users/[id]/role - 사용자 역할 변경
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;
    const { newRole, profileData, examinerAction, expertAction } = await request.json();

    // 유효한 역할인지 확인
    const validRoles = ['user', 'examiner', 'expert', 'admin'];
    if (!validRoles.includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
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
      return NextResponse.json(
        {
          error: 'Forbidden - Admin access required',
          debug: {
            currentUserEmail: session.user?.email,
            currentUserRole: userRole,
          },
        },
        { status: 403 }
      );
    }

    // 사용자 찾기
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 사용자 역할 업데이트
    const updateData: any = {
      role: newRole,
      updatedAt: new Date(),
    };

    // $unset 필드는 별도로 모아서 마지막에 updateOne에 전달 (MongoDB는 $set 안의 $unset 키를 거부함)
    const unsetData: Record<string, ''> = {};

    // 기업심사관에서 다른 역할로 전환 시 (역할 해제)
    if (user.role === 'examiner' && newRole !== 'examiner') {
      // 배정된 상담이 있는지 확인
      const assignedConsultations = await db.collection('consultations').countDocuments({
        assignedStaffId: user.email,
        status: { $in: ['pending', 'assigned', 'in_progress', 'review'] },
      });

      if (assignedConsultations > 0) {
        return NextResponse.json(
          {
            error: `현재 ${assignedConsultations}건의 상담이 배정되어 있습니다. 먼저 다른 담당자에게 재배정해주세요.`,
            assignedConsultations,
          },
          { status: 400 }
        );
      }

      // expert-examiners에서 userId 제거
      // 안전장치: examinerId 형식이 유효하고, 해당 도큐먼트의 userId가 *이 사용자*일 때만 끊는다.
      // (잘못 연결된 examinerId가 다른 사용자의 프로필을 가리킬 경우 그 연결까지 함께 끊기지 않도록)
      if (user.examinerId && ObjectId.isValid(user.examinerId)) {
        try {
          await db.collection('expert-examiners').updateOne(
            { _id: new ObjectId(user.examinerId), userId: userId },
            {
              $unset: { userId: '' },
              $set: { updatedAt: new Date() },
            }
          );
        } catch (unlinkErr) {
          console.warn('[role] examiner unlink skipped:', unlinkErr);
        }
      }

      // users에서 examinerId 제거 (잘못 연결된 ID여도 무조건 정리)
      unsetData.examinerId = '';
    }

    // 전문가에서 다른 역할로 전환 시 (역할 해제)
    if (user.role === 'expert' && newRole !== 'expert') {
      // experts에서 userId 제거 (소유권 일치할 때만)
      if (user.expertId && ObjectId.isValid(user.expertId)) {
        try {
          await db.collection('experts').updateOne(
            { _id: new ObjectId(user.expertId), userId: userId },
            {
              $unset: { userId: '' },
              $set: { updatedAt: new Date() },
            }
          );
        } catch (unlinkErr) {
          console.warn('[role] expert unlink skipped:', unlinkErr);
        }
      }

      // users에서 expertId 제거
      unsetData.expertId = '';
    }

    // 기업심사관(examiner)으로 전환 시
    if (newRole === 'examiner') {
      // examinerAction이 없으면 에러 반환
      if (!examinerAction || !examinerAction.examinerId) {
        return NextResponse.json(
          {
            error: '기업심사관 프로필을 선택해주세요.',
          },
          { status: 400 }
        );
      }

      // 기존 심사관 프로필과 연결
      updateData.examinerId = examinerAction.examinerId;

      // 심사관 프로필에 userId 추가
      await db.collection('expert-examiners').updateOne(
        { _id: new ObjectId(examinerAction.examinerId) },
        {
          $set: {
            userId: userId,
            updatedAt: new Date(),
          },
        }
      );
    }

    // 전문가(expert)로 전환 시
    if (newRole === 'expert') {
      // expertAction이 없으면 에러 반환
      if (!expertAction || !expertAction.expertId) {
        return NextResponse.json(
          {
            error: '전문가 프로필을 선택해주세요.',
          },
          { status: 400 }
        );
      }

      // 기존 전문가 프로필과 연결
      updateData.expertId = expertAction.expertId;

      // 전문가 프로필에 userId 추가
      await db.collection('experts').updateOne(
        { _id: new ObjectId(expertAction.expertId) },
        {
          $set: {
            userId: userId,
            updatedAt: new Date(),
          },
        }
      );
    }

    // 사용자 정보 업데이트 ($set과 $unset을 각각 분리해서 전달)
    const updateOp: Record<string, any> = { $set: updateData };
    if (Object.keys(unsetData).length > 0) {
      updateOp.$unset = unsetData;
    }
    const result = await db.collection('users').updateOne({ _id: new ObjectId(userId) }, updateOp);

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 역할 변경 로그 저장
    await db.collection('roleLogs').insertOne({
      userId,
      previousRole: user.role || 'user',
      newRole,
      changedBy: session.user?.email,
      changedAt: new Date(),
      reason: profileData?.reason || '관리자 권한으로 변경',
    });

    return NextResponse.json({
      success: true,
      message: `사용자 역할이 ${newRole}(으)로 변경되었습니다.`,
      examinerId: updateData.examinerId,
      expertId: updateData.expertId,
    });
  } catch (error) {
    console.error('Failed to update user role:', error);
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }
}
