import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth-options';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/examiners/[id]/unlink - 심사관 카드와 사용자 연결 해제
 *
 * @purpose 관리자가 심사관 카드에서 사용자 연결을 해제
 * @context 실수로 잘못 연결했거나, 심사관이 더 이상 그 역할을 하지 않을 때
 * @decision 카드는 유지, userId와 email만 제거
 * @security admin 또는 super_admin 권한 필요
 * @note 사용자의 role을 'user'로 변경하고 examinerId를 null로 설정 (다시 연결 가능하게)
 */
export async function PUT(
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

    const examinerId = params.id;

    // 5. 심사관 카드 조회
    const examiner = await db.collection('expert-examiners').findOne({
      _id: new ObjectId(examinerId)
    });

    if (!examiner) {
      return NextResponse.json({ error: 'Examiner not found' }, { status: 404 });
    }

    // 6. 연결된 사용자가 없으면 에러
    if (!examiner.userId) {
      return NextResponse.json({
        error: '이 심사관 카드는 사용자와 연결되어 있지 않습니다.'
      }, { status: 400 });
    }

    // 7. User 컬렉션에서 role을 'user'로 변경, examinerId 제거
    const userId = examiner.userId;
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          role: 'user',
          updatedAt: new Date()
        },
        $unset: {
          examinerId: ''
        }
      }
    );

    // 8. ExpertExaminer 컬렉션에서 연결 해제 (userId와 email 제거)
    const result = await db.collection('expert-examiners').updateOne(
      { _id: new ObjectId(examinerId) },
      {
        $unset: {
          userId: '',
          email: ''
        },
        $set: {
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Examiner not found' }, { status: 404 });
    }

    // 9. 성공 응답
    return NextResponse.json({
      success: true,
      message: `${examiner.name} 심사관의 사용자 연결이 해제되었습니다. 사용자 role이 'user'로 변경되었습니다.`,
      examiner: {
        id: examiner._id,
        name: examiner.name,
        previousUserId: examiner.userId
      }
    });

  } catch (error) {
    console.error('[Admin Examiners Unlink API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to unlink examiner', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
