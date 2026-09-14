import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth-options';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { buildAscendingCursorFilter, parseListRequest, takePage } from '@/lib/bounded-read';

type ExaminerDocument = {
  readonly _id: ObjectId;
  readonly name?: string;
  readonly position?: string;
  readonly companyName?: string;
  readonly category?: string;
  readonly specialties?: readonly unknown[];
  readonly imageUrl?: string;
  readonly userId?: ObjectId | string;
  readonly isPublished?: boolean;
  readonly sortOrder?: number;
  readonly createdAt?: Date | string;
  readonly updatedAt?: Date | string;
  readonly brandPage?: {
    readonly companyLogo?: unknown;
    readonly companyIntro?: unknown;
    readonly useDefaultIntro?: boolean;
    readonly careers?: readonly unknown[];
    readonly successCases?: readonly unknown[];
    readonly contactInfo?: {
      readonly website?: unknown;
      readonly consultationHours?: unknown;
      readonly address?: unknown;
    };
  };
};

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
        error: 'Forbidden - Admin access required'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const listRequestResult = parseListRequest(searchParams, { defaultLimit: 25, maxLimit: 50 });
    if (listRequestResult.kind === 'invalid') {
      return NextResponse.json({ error: listRequestResult.message }, { status: 400 });
    }
    const { limit, cursor } = listRequestResult.request;
    const query = cursor
      ? buildAscendingCursorFilter(cursor, 'name', (id) => new ObjectId(id))
      : {};

    const examiners = await db.collection('expert-examiners')
      .find(query)
      .sort({ name: 1, _id: 1 })
      .limit(limit + 1)
      .toArray();
    const page = takePage<ExaminerDocument>(examiners, limit, (examiner) => ({
      sortValue: String(examiner.name || ''),
      id: examiner._id.toString(),
    }));
    const userIds = page.items.flatMap((examiner) => {
      if (examiner.userId instanceof ObjectId) {
        return [examiner.userId];
      }
      if (typeof examiner.userId === 'string' && ObjectId.isValid(examiner.userId)) {
        return [new ObjectId(examiner.userId)];
      }
      return [];
    });
    const linkedUsers = userIds.length
      ? await db.collection('users').find({ _id: { $in: userIds } }).project({ email: 1 }).toArray()
      : [];
    const emailByUserId = new Map(
      linkedUsers.map((user) => [user._id.toString(), typeof user.email === 'string' ? user.email : null])
    );

    const formattedExaminers = page.items.map((examiner) => {
      const email = examiner.userId ? emailByUserId.get(examiner.userId.toString()) || null : null;

      // 브랜드 페이지 정보 완성도 체크
      const brandPage = examiner.brandPage || {};
      const hasBrandPageContent = !!(
        brandPage.companyLogo ||
        (brandPage.companyIntro && !brandPage.useDefaultIntro) ||
        (brandPage.careers && brandPage.careers.length > 0) ||
        (brandPage.successCases && brandPage.successCases.length > 0) ||
        brandPage.contactInfo?.website ||
        brandPage.contactInfo?.consultationHours ||
        brandPage.contactInfo?.address
      );

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
        hasBrandPageContent, // 브랜드 페이지 내용 유무
        createdAt: examiner.createdAt,
        updatedAt: examiner.updatedAt
      };
    });

    return NextResponse.json(
      {
        examiners: formattedExaminers,
        total: null,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );

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
