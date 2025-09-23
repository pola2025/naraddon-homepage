import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb-client';

// GET /api/users/[id]/activities - 사용자 활동 내역 조회
export async function GET(
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

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    // 사용자 활동 내역 조회
    // TODO: 실제 활동 내역 조회 로직 구현
    const activities = await db.collection('activities')
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    // 현재는 빈 배열 반환
    if (!activities || activities.length === 0) {
      return NextResponse.json([]);
    }

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Failed to fetch user activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user activities' },
      { status: 500 }
    );
  }
}