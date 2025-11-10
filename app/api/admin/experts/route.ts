import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/auth-options';
import clientPromise from '@/lib/mongodb-client';

/**
 * GET: 전문가 목록 조회 (관리자 전용)
 * @purpose 관리자가 모든 전문가 정보를 조회
 * @security admin 역할만 접근 가능
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Login required' },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db('naraddon');

    // DB에서 실제 사용자 역할 확인
    const currentUser = await db.collection('users').findOne({ email: session.user.email });

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const experts = await db.collection('experts')
      .find({})
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      experts: experts.map(expert => ({
        ...expert,
        _id: expert._id.toString()
      }))
    });
  } catch (error) {
    console.error('Failed to fetch experts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch experts' },
      { status: 500 }
    );
  }
}
