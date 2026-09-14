import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth-options';
import dbConnect from '@/lib/mongodb';
import Expert from '@/models/Expert';
import { isAdmin } from '@/lib/auth/role-check';
import { buildAscendingCursorFilter, parseListRequest, takePage } from '@/lib/bounded-read';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const listRequestResult = parseListRequest(request.nextUrl.searchParams, {
      defaultLimit: 24,
      maxLimit: 50,
    });
    if (listRequestResult.kind === 'invalid') {
      return NextResponse.json({ success: false, error: listRequestResult.message }, { status: 400 });
    }
    const { limit, cursor } = listRequestResult.request;
    const adminAuthRequested = request.headers.get('x-admin-auth') === 'true';
    if (adminAuthRequested) {
      const session = await getServerSession(authOptions);
      if (!session?.user || !isAdmin(session.user)) {
        return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
      }
    }
    const baseQuery: Record<string, unknown> = adminAuthRequested ? {} : { isActive: true };
    const cursorFilter = cursor ? buildAscendingCursorFilter(cursor, 'order') : null;
    const query = cursorFilter ? { $and: [baseQuery, cursorFilter] } : baseQuery;

    const experts = await Expert.find(query)
      .sort({ order: 1, _id: 1 })
      .limit(limit + 1)
      .select('-__v');
    const page = takePage(experts, limit, (expert) => ({
      sortValue: Number(expert.order || 0),
      id: expert._id.toString(),
    }));

    // Transform data to match ExaminerProfile format
    const transformedExperts = page.items.map((expert) => ({
      _id: expert._id.toString(),
      name: expert.name,
      position: expert.position,
      companyName: expert.companyName,
      category: 'expert',
      specialties: expert.specialties,
      imageUrl: `/images/examiners/${expert.imageKey}.png`,
      imageAlt: `${expert.name} 전문가 사진`,
      sortOrder: expert.order,
      imageKey: expert.imageKey, // admin 페이지용 추가
      legacyKey: expert.imageKey,
      order: expert.order, // admin 페이지용 추가
      isActive: expert.isActive, // admin 페이지용 추가
      isPublished: expert.isActive,
    }));

    return NextResponse.json({
      success: true,
      experts: transformedExperts,
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
    }, {
      headers: {
        'Cache-Control': adminAuthRequested
          ? 'private, no-store'
          : 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Error fetching experts:', error);

    // Return fallback data if database error
    const fallbackExperts = [
      {
        _id: 'expert-baek-kyung-woo',
        name: '백경우',
        position: '변리사',
        companyName: '백경특허법률사무소',
        category: 'intellectual_property',
        specialties: ['특허', '상표', '디자인'],
        imageUrl: '/images/examiners/baek-kyung-woo.png',
        imageAlt: '백경우 전문가 사진',
        sortOrder: 1,
        legacyKey: 'baek-kyung-woo',
        isPublished: true,
      },
      {
        _id: 'expert-sung-min-seok',
        name: '성민석',
        position: '세무사',
        companyName: '세무법인 우진',
        category: 'tax',
        specialties: ['세무조사', '절세전략', '기업자문'],
        imageUrl: '/images/examiners/sung-min-seok.png',
        imageAlt: '성민석 전문가 사진',
        sortOrder: 2,
        legacyKey: 'sung-min-seok',
        isPublished: true,
      },
      {
        _id: 'expert-jeon-ki-hong',
        name: '전기홍',
        position: '행정사',
        companyName: '창성',
        category: 'administration',
        specialties: ['인허가', '행정심판', '행정소송'],
        imageUrl: '/images/examiners/jeon-ki-hong.png',
        imageAlt: '전기홍 전문가 사진',
        sortOrder: 3,
        legacyKey: 'jeon-ki-hong',
        isPublished: true,
      },
      {
        _id: 'expert-choi-il-hyun',
        name: '최일현',
        position: '회계사',
        companyName: '우일회계법인',
        category: 'accounting',
        specialties: ['재무제표', '회계감사', '세무조정'],
        imageUrl: '/images/examiners/choi-il-hyun.png',
        imageAlt: '최일현 전문가 사진',
        sortOrder: 4,
        legacyKey: 'choi-il-hyun',
        isPublished: true,
      },
    ];

    return NextResponse.json({
      success: true,
      experts: fallbackExperts
    });
  }
}

export async function POST(request: NextRequest) {
  // 관리자 권한 확인
  const adminAuth = request.headers.get('x-admin-auth');
  if (adminAuth !== 'true') {
    return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    await dbConnect();
    const body = await request.json();

    const newExpert = await Expert.create({
      name: body.name,
      position: body.position,
      companyName: body.companyName,
      specialties: body.specialties || [],
      imageKey: body.imageKey,
      order: body.order || 0,
      isActive: body.isActive !== undefined ? body.isActive : true,
    });

    return NextResponse.json({
      success: true,
      expert: {
        _id: newExpert._id.toString(),
        name: newExpert.name,
        position: newExpert.position,
        companyName: newExpert.companyName,
        specialties: newExpert.specialties,
        imageKey: newExpert.imageKey,
        order: newExpert.order,
        isActive: newExpert.isActive,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating expert:', error);
    return NextResponse.json({ error: '전문가 등록에 실패했습니다.' }, { status: 500 });
  }
}
