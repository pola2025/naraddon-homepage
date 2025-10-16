import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

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

    // userId로 users 컬렉션에서 이메일 조회
    const formattedExaminers = await Promise.all(examiners.map(async (examiner) => {
      let email = null;

      // userId가 있으면 users 컬렉션에서 이메일 조회
      if (examiner.userId) {
        try {
          // userId가 string이면 ObjectId로 변환, 이미 ObjectId면 그대로 사용
          const userIdQuery = typeof examiner.userId === 'string'
            ? new ObjectId(examiner.userId)
            : examiner.userId;

          const user = await db.collection('users').findOne({ _id: userIdQuery });
          email = user?.email || null;

          // 디버깅용 로그 (임시)
          if (!user) {
            console.log(`[Examiners API] User not found for examiner ${examiner.name}, userId:`, examiner.userId);
          }
        } catch (error) {
          console.error(`[Examiners API] Error fetching user for examiner ${examiner.name}:`, error);
        }
      }

      return {
        _id: examiner._id.toString(),
        name: examiner.name,
        email: email, // 이메일 추가
        position: examiner.position,
        companyName: examiner.companyName,
        category: examiner.category,
        specialties: examiner.specialties || [],
        imageUrl: examiner.imageUrl,
        userId: examiner.userId?.toString() || null,
        isPublished: examiner.isPublished,
        sortOrder: examiner.sortOrder,
        createdAt: examiner.createdAt,
        updatedAt: examiner.updatedAt
      };
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

// POST /api/admin/examiners - 심사관 추가 (관리자 전용)
export async function POST(request: NextRequest) {
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
        error: 'Forbidden - Admin access required'
      }, { status: 403 });
    }

    const body = await request.json();
    const { name, position, companyName, category, specialties, imageUrl, isPublished, sortOrder } = body;

    // 필수 필드 검증
    if (!name || !companyName) {
      return NextResponse.json({ error: 'Name and company are required' }, { status: 400 });
    }

    // legacyKey 생성 (이름을 소문자로 변환하고 공백을 하이픈으로)
    const legacyKey = name.toLowerCase().replace(/\s+/g, '-');

    const now = new Date();
    const examinerData = {
      name,
      position: position || '인증 기업심사관',
      companyName,
      category: category || 'funding',
      specialties: specialties || [],
      imageUrl: imageUrl || '',
      imageAlt: `${name} ${position || '인증 기업심사관'}`,
      sortOrder: sortOrder || 999,
      legacyKey,
      isPublished: isPublished !== false,
      userId: null,
      createdAt: now,
      updatedAt: now
    };

    const result = await db.collection('expert-examiners').insertOne(examinerData);

    return NextResponse.json({
      success: true,
      examinerId: result.insertedId.toString(),
      message: '심사관이 추가되었습니다.'
    });

  } catch (error) {
    console.error('[Admin Examiners API] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to add examiner', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
