import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb-client';

export const dynamic = 'force-dynamic';

// GET /api/admin/examiners - 심사관 목록 조회 (관리자 전용)
export async function GET(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // 심사관 목록 조회 (DB에 실제로 존재하는 데이터만)
    const examiners = await db.collection('expert-examiners')
      .find({})
      .sort({ sortOrder: 1, createdAt: -1 })
      .toArray();

    // 응답 데이터 포맷팅
    const formattedExaminers = examiners.map(examiner => ({
      _id: examiner._id.toString(),
      name: examiner.name,
      position: examiner.position,
      companyName: examiner.companyName,
      category: examiner.category,
      specialties: examiner.specialties || [],
      imageUrl: examiner.imageUrl,
      userId: examiner.userId,
      isPublished: examiner.isPublished,
      sortOrder: examiner.sortOrder,
      createdAt: examiner.createdAt,
      updatedAt: examiner.updatedAt
    }));

    return NextResponse.json({
      examiners: formattedExaminers,
      total: formattedExaminers.length
    });

  } catch (error) {
    console.error('[Admin Examiners API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch examiners', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
