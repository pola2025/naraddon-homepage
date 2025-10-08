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

    // 관리자 권한 확인
    const userRole = (session.user as any)?.role;
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    // 심사관 목록 조회 (userId가 없는 것 포함 모든 심사관)
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
    console.error('Failed to fetch examiners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch examiners' },
      { status: 500 }
    );
  }
}
