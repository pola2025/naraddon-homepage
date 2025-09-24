import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb-client';

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

    // 관리자만 접근 가능
    const userRole = (session.user as any)?.role;
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = params.id;
    const { newRole, profileData } = await request.json();

    // 유효한 역할인지 확인
    const validRoles = ['user', 'auditor', 'expert', 'admin'];
    if (!validRoles.includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    // 사용자 역할 업데이트
    const updateData: any = {
      role: newRole,
      updatedAt: new Date()
    };

    // 기업심사관으로 전환 시 추가 프로필 정보
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

    // 전문가로 전환 시 추가 프로필 정보
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
      { email: userId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 역할 변경 로그 저장
    await db.collection('roleLogs').insertOne({
      userId,
      previousRole: userRole,
      newRole,
      changedBy: session.user?.email,
      changedAt: new Date(),
      reason: profileData?.reason || '관리자 권한으로 변경'
    });

    return NextResponse.json({
      success: true,
      message: `사용자 역할이 ${newRole}(으)로 변경되었습니다.`
    });
  } catch (error) {
    console.error('Failed to update user role:', error);
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}