import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb-client';
import { AdminRoleUpgrade, AdminActionType, AdminLogSeverity } from '@/types/admin-log.types';

// POST /api/admin/users/[id]/upgrade - 사용자를 관리자로 승격
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // super_admin만 다른 사용자를 관리자로 승격 가능
    const currentRole = (session.user as any)?.role;
    if (currentRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admin can upgrade users to admin' },
        { status: 403 }
      );
    }

    const userId = params.id;
    const data = await request.json();

    // IP 주소 가져오기
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] :
               request.headers.get('x-real-ip') ||
               'unknown';

    const client = await clientPromise;
    const db = client.db('naraddon');

    // 대상 사용자 조회
    const targetUser = await db.collection('users').findOne({ email: userId });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 이미 관리자인지 확인
    if (targetUser.role === 'admin' || targetUser.role === 'super_admin') {
      return NextResponse.json(
        { error: 'User is already an admin' },
        { status: 400 }
      );
    }

    // 관리자 승격 기록 생성
    const upgradeRecord: AdminRoleUpgrade = {
      userId: targetUser._id.toString(),
      userEmail: targetUser.email,
      userName: targetUser.name || targetUser.email,

      fromRole: targetUser.role || 'user',
      toRole: 'admin',

      upgradedBy: session.user?.email || '',
      upgradedByName: session.user?.name || '',
      upgradedByEmail: session.user?.email || '',

      reason: data.reason || '관리자 권한 부여',
      notes: data.notes,
      permissions: data.permissions || ['admin_dashboard', 'user_management', 'consultation_management'],
      restrictions: data.restrictions || [],
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,

      requestIp: ip,
      requestedAt: new Date(),
      approvedAt: new Date(),
      status: 'approved'
    };

    // 트랜잭션 시작 (사용자 역할 업데이트 + 로그 기록)
    const session_db = client.startSession();

    try {
      await session_db.withTransaction(async () => {
        // 1. 사용자 역할 업데이트
        await db.collection('users').updateOne(
          { email: userId },
          {
            $set: {
              role: 'admin',
              adminSince: new Date(),
              adminUpgradedBy: session.user?.email,
              adminPermissions: upgradeRecord.permissions,
              adminRestrictions: upgradeRecord.restrictions,
              adminExpiresAt: upgradeRecord.expiresAt,
              updatedAt: new Date()
            }
          }
        );

        // 2. 승격 기록 저장
        await db.collection('adminUpgrades').insertOne(upgradeRecord);

        // 3. 관리자 활동 로그 기록
        await db.collection('adminLogs').insertOne({
          adminId: session.user?.email,
          adminEmail: session.user?.email,
          adminName: session.user?.name,
          adminRole: currentRole,
          provider: (session.user as any)?.provider || 'unknown',

          action: AdminActionType.ROLE_CHANGE,
          description: `사용자 ${targetUser.email}을(를) 관리자로 승격`,
          details: {
            targetUserId: userId,
            targetUserEmail: targetUser.email,
            fromRole: targetUser.role,
            toRole: 'admin',
            reason: upgradeRecord.reason
          },
          targetResource: 'user',
          targetId: userId,

          ipAddress: ip,
          severity: AdminLogSeverity.CRITICAL,

          timestamp: new Date()
        });

        // 4. 보안 알림 생성 (중요 이벤트)
        await db.collection('securityAlerts').insertOne({
          type: 'ADMIN_UPGRADE',
          performedBy: session.user?.email,
          targetUser: targetUser.email,
          fromRole: targetUser.role,
          toRole: 'admin',
          reason: upgradeRecord.reason,
          ipAddress: ip,
          timestamp: new Date(),
          severity: AdminLogSeverity.CRITICAL
        });
      });
    } finally {
      await session_db.endSession();
    }

    // 이메일 알림 발송 (선택사항)
    // TODO: 승격된 사용자에게 이메일 알림 발송

    return NextResponse.json({
      success: true,
      message: `${targetUser.email}님이 관리자로 승격되었습니다.`,
      upgradeDetails: {
        userId: targetUser._id,
        email: targetUser.email,
        name: targetUser.name,
        newRole: 'admin',
        permissions: upgradeRecord.permissions,
        expiresAt: upgradeRecord.expiresAt
      }
    });
  } catch (error) {
    console.error('Failed to upgrade user to admin:', error);
    return NextResponse.json(
      { error: 'Failed to upgrade user to admin' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id]/upgrade - 관리자 권한 해제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // super_admin만 관리자 권한 해제 가능
    const currentRole = (session.user as any)?.role;
    if (currentRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admin can revoke admin privileges' },
        { status: 403 }
      );
    }

    const userId = params.id;
    const { reason } = await request.json();

    // IP 주소 가져오기
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] :
               request.headers.get('x-real-ip') ||
               'unknown';

    const client = await clientPromise;
    const db = client.db('naraddon');

    // 대상 사용자 조회
    const targetUser = await db.collection('users').findOne({ email: userId });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // super_admin은 해제할 수 없음
    if (targetUser.role === 'super_admin') {
      return NextResponse.json(
        { error: 'Cannot revoke super admin privileges' },
        { status: 400 }
      );
    }

    // 관리자가 아닌 경우
    if (targetUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'User is not an admin' },
        { status: 400 }
      );
    }

    // 권한 해제 처리
    await db.collection('users').updateOne(
      { email: userId },
      {
        $set: {
          role: 'user',
          updatedAt: new Date()
        },
        $unset: {
          adminSince: '',
          adminUpgradedBy: '',
          adminPermissions: '',
          adminRestrictions: '',
          adminExpiresAt: ''
        }
      }
    );

    // 활동 로그 기록
    await db.collection('adminLogs').insertOne({
      adminId: session.user?.email,
      adminEmail: session.user?.email,
      adminName: session.user?.name,
      adminRole: currentRole,
      provider: (session.user as any)?.provider || 'unknown',

      action: AdminActionType.ROLE_CHANGE,
      description: `${targetUser.email}의 관리자 권한 해제`,
      details: {
        targetUserId: userId,
        targetUserEmail: targetUser.email,
        fromRole: 'admin',
        toRole: 'user',
        reason
      },
      targetResource: 'user',
      targetId: userId,

      ipAddress: ip,
      severity: AdminLogSeverity.CRITICAL,

      timestamp: new Date()
    });

    return NextResponse.json({
      success: true,
      message: `${targetUser.email}님의 관리자 권한이 해제되었습니다.`
    });
  } catch (error) {
    console.error('Failed to revoke admin privileges:', error);
    return NextResponse.json(
      { error: 'Failed to revoke admin privileges' },
      { status: 500 }
    );
  }
}