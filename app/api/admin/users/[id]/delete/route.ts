import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth-options';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

/**
 * DELETE /api/admin/users/[id]/delete - 관리자가 사용자 강제 탈퇴
 *
 * @purpose 관리자가 특정 사용자를 강제로 탈퇴 처리
 * @context 악의적 사용자, 정책 위반 사용자 등을 관리자가 제재
 * @security admin 또는 super_admin 권한 필요
 * @decision 게시글/댓글은 보존, 계정 정보만 삭제
 * @note 탈퇴 사유는 withdrawal_reasons 컬렉션에 관리자 정보와 함께 저장
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. 세션 확인
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    // 3. 현재 로그인한 사용자의 role 확인
    const currentUser = await db.collection('users').findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    // 4. 관리자 권한 확인
    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      return NextResponse.json({
        error: 'Forbidden - Admin access required'
      }, { status: 403 });
    }

    // 5. 요청 바디에서 사유 추출
    const body = await request.json();
    const { reason, adminNote, addToBlacklist } = body;

    if (!reason || reason.trim() === '') {
      return NextResponse.json(
        { error: '탈퇴 사유를 입력해주세요' },
        { status: 400 }
      );
    }

    // 6. 탈퇴할 사용자 조회
    const userId = params.id;
    let targetUser;

    // ObjectId 형식인지 확인
    if (ObjectId.isValid(userId)) {
      targetUser = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    }

    // ObjectId로 찾지 못하면 이메일로 시도
    if (!targetUser) {
      targetUser = await db.collection('users').findOne({ email: userId });
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 7. 본인 계정 탈퇴 방지
    if (targetUser.email === session.user.email) {
      return NextResponse.json({
        error: '본인 계정은 관리자 페이지에서 탈퇴할 수 없습니다'
      }, { status: 400 });
    }

    // 8. Super Admin 탈퇴 방지 (관리자 간 견제)
    if (targetUser.role === 'super_admin' && currentUser.role !== 'super_admin') {
      return NextResponse.json({
        error: 'Super Admin 계정은 탈퇴시킬 수 없습니다'
      }, { status: 403 });
    }

    // 9. 탈퇴 사유 저장 (관리자 정보 포함)
    await db.collection('withdrawal_reasons').insertOne({
      userId: targetUser._id,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role || 'user',
      reason: reason.trim(),
      adminNote: adminNote?.trim() || null,
      withdrawalType: 'admin_forced', // 관리자 강제 탈퇴 표시
      addedToBlacklist: addToBlacklist || false,
      adminId: currentUser._id,
      adminEmail: currentUser.email,
      adminName: currentUser.name,
      withdrawnAt: new Date(),
      userCreatedAt: targetUser.createdAt,
    });

    // 9-1. 블랙리스트 등록 (옵션)
    if (addToBlacklist) {
      await db.collection('auth-blacklist').insertOne({
        email: targetUser.email,
        reason: reason.trim(),
        adminNote: adminNote?.trim() || null,
        blockedBy: currentUser.email,
        blockedAt: new Date(),
        originalUserId: targetUser._id,
        originalUserName: targetUser.name,
      });
      console.log('[Admin User Delete] Added to blacklist:', targetUser.email);
    }

    // 10. 관련 데이터 정리 (선택적)
    // expert-examiners에서 userId 참조 제거
    if (targetUser.role === 'examiner') {
      await db.collection('expert-examiners').updateMany(
        { userId: targetUser._id.toString() },
        { $unset: { userId: '' } }
      );
    }

    // 11. 사용자 계정 삭제
    const deleteResult = await db.collection('users').deleteOne({
      _id: targetUser._id
    });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json(
        { error: '계정 삭제에 실패했습니다' },
        { status: 500 }
      );
    }

    // 12. 성공 응답
    const blacklistMsg = addToBlacklist ? ' (블랙리스트 등록됨)' : '';
    return NextResponse.json({
      success: true,
      message: `${targetUser.name} (${targetUser.email}) 계정이 탈퇴 처리되었습니다${blacklistMsg}`,
      withdrawnUser: {
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role
      },
      addedToBlacklist: addToBlacklist || false,
      withdrawnAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Admin User Delete] Error:', error);
    return NextResponse.json(
      { error: '계정 탈퇴 처리 중 오류가 발생했습니다', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
