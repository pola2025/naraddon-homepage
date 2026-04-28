import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/auth-options';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

/**
 * POST: 전문가 활성화/비활성화 토글 (관리자 전용)
 * @purpose 관리자가 전문가 프로필의 활성화 상태를 변경
 * @security admin 역할만 접근 가능
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    /**
     * 권한 완화 (2026-04-28): admin/super_admin 모두 허용
     */
    const role = session?.user?.role;
    if (!session || !session.user || (role !== 'admin' && role !== 'super_admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const { expertId, isActive } = await request.json();

    if (!expertId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'expertId and isActive are required' },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(expertId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid expertId format' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('naraddon');

    // 전문가 활성화 상태 변경
    const result = await db.collection('experts').updateOne(
      { _id: new ObjectId(expertId) },
      {
        $set: {
          isActive: isActive,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: 'Expert not found' }, { status: 404 });
    }

    console.log(`[Admin] Expert ${expertId} isActive changed to ${isActive}`);

    return NextResponse.json({
      success: true,
      message: `Expert ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    console.error('Failed to toggle expert status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to toggle expert status' },
      { status: 500 }
    );
  }
}
