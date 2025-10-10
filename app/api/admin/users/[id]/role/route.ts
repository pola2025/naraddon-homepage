import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

// PUT /api/admin/users/[id]/role - 사용자 역할 변경
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;
    const { newRole, profileData, examinerAction } = await request.json();

    // 유효한 역할인지 확인
    const validRoles = ['user', 'auditor', 'examiner', 'expert', 'admin'];
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
      return NextResponse.json({
        error: 'Forbidden - Admin access required',
        debug: {
          currentUserEmail: session.user?.email,
          currentUserRole: userRole
        }
      }, { status: 403 });
    }

    // 사용자 찾기
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 사용자 역할 업데이트
    const updateData: any = {
      role: newRole,
      updatedAt: new Date()
    };

    // 기업심사관에서 다른 역할로 전환 시 (역할 해제)
    if (user.role === 'examiner' && newRole !== 'examiner') {
      // 배정된 상담이 있는지 확인
      const assignedConsultations = await db.collection('consultations').countDocuments({
        assignedStaffId: user.email,
        status: { $in: ['pending', 'assigned', 'in_progress', 'review'] }
      });

      if (assignedConsultations > 0) {
        return NextResponse.json({
          error: `현재 ${assignedConsultations}건의 상담이 배정되어 있습니다. 먼저 다른 담당자에게 재배정해주세요.`,
          assignedConsultations
        }, { status: 400 });
      }

      // expert-examiners에서 userId 제거
      if (user.examinerId) {
        await db.collection('expert-examiners').updateOne(
          { _id: new ObjectId(user.examinerId) },
          {
            $unset: { userId: '' },
            $set: { updatedAt: new Date() }
          }
        );
      }

      // users에서 examinerId 제거
      updateData.$unset = { examinerId: '' };
    }

    // 기업심사관(examiner)으로 전환 시
    if (newRole === 'examiner' && examinerAction) {
      if (examinerAction.action === 'create') {
        // 신규 심사관 프로필 생성
        const examinerProfile = {
          name: profileData?.name || user.name,
          position: profileData?.position || '인증 기업심사관',
          companyName: profileData?.companyName || user.profile?.company || '',
          category: profileData?.category || 'funding',
          specialties: profileData?.specialties || user.profile?.specialty || [],
          imageUrl: profileData?.imageUrl || '',
          imageAlt: `${profileData?.name || user.name} 인증 기업심사관`,
          sortOrder: profileData?.sortOrder || 999,
          legacyKey: profileData?.legacyKey || user.email.split('@')[0].toLowerCase(),
          isPublished: profileData?.isPublished !== false,
          userId: userId,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const examinerResult = await db.collection('expert-examiners').insertOne(examinerProfile);
        updateData.examinerId = examinerResult.insertedId.toString();

      } else if (examinerAction.action === 'link' && examinerAction.examinerId) {
        // 기존 심사관 프로필과 연결
        updateData.examinerId = examinerAction.examinerId;

        // 심사관 프로필에 userId 추가
        await db.collection('expert-examiners').updateOne(
          { _id: new ObjectId(examinerAction.examinerId) },
          {
            $set: {
              userId: userId,
              updatedAt: new Date()
            }
          }
        );
      }
    }

    // 기업심사관(auditor) - 레거시 지원
    if (newRole === 'auditor' && profileData) {
      updateData['auditorProfile'] = {
        specialty: profileData.specialty || [],
        experience: profileData.experience || 0,
        certifications: profileData.certifications || [],
        introduction: profileData.introduction || '',
        availableTime: profileData.availableTime || '',
        consultationFee: profileData.consultationFee || '',
        profileImage: profileData.profileImage || '',
        isPublic: profileData.isPublic !== false
      };
    }

    // 전문가로 전환 시
    if (newRole === 'expert' && profileData) {
      updateData['expertProfile'] = {
        field: profileData.field || '',
        specialty: profileData.specialty || [],
        experience: profileData.experience || 0,
        education: profileData.education || [],
        certifications: profileData.certifications || [],
        introduction: profileData.introduction || '',
        achievements: profileData.achievements || [],
        consultationAreas: profileData.consultationAreas || [],
        consultationFee: profileData.consultationFee || '',
        profileImage: profileData.profileImage || '',
        rating: 0,
        reviewCount: 0,
        isPublic: profileData.isPublic !== false
      };
    }

    // 사용자 정보 업데이트
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateData }
    );

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
      reason: profileData?.reason || '관리자 권한으로 변경'
    });

    return NextResponse.json({
      success: true,
      message: `사용자 역할이 ${newRole}(으)로 변경되었습니다.`,
      examinerId: updateData.examinerId
    });
  } catch (error) {
    console.error('Failed to update user role:', error);
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}