import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth-options';
import { isAdmin } from '@/lib/auth/role-check';
import dbConnect from '@/lib/mongodb';
import Expert from '@/models/Expert';
import { buildAscendingCursorFilter, parseListRequest, takePage } from '@/lib/bounded-read';

/**
 * 전문가 관리 API
 *
 * @purpose 전문가 목록 조회(공개) / 등록·수정·삭제(관리자 전용)
 * @security POST/PUT/DELETE는 NextAuth 세션 + 관리자 권한 필수
 */

/* 허용 필드 allowlist — MongoDB에 직접 전달되므로 명시적으로 제한
 *
 * @note 2026-04-28 통합 페이지 대응으로 Expert 컬렉션 실제 필드 보강:
 *       position, companyName, specialties, cardImageUrl, email, userId, introduction,
 *       detailedIntro, services, successCases, galleryImages, certifications
 *       (detail 페이지 /expert-services/[id] 가 직접 사용)
 */
const ALLOWED_EXPERT_FIELDS = [
  'name',
  'title',
  'position',
  'imageKey',
  'imageUrl',
  'cardImageUrl',
  'specialty',
  'specialties',
  'companyName',
  'email',
  'userId',
  'bio',
  'introduction',
  'detailedIntro',
  'services',
  'successCases',
  'galleryImages',
  'certifications',
  'order',
  'isActive',
  'contact',
  'career',
  'education',
  'certificates',
  'description',
] as const;

/** body에서 허용 필드만 추출 */
function pickAllowed(body: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const key of ALLOWED_EXPERT_FIELDS) {
    if (key in body) {
      safe[key] = body[key];
    }
  }
  return safe;
}

/** 관리자 세션 검증 — 실패 시 NextResponse 반환 */
async function requireAdminSession(): Promise<
  { ok: true } | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      ),
    };
  }
  if (!isAdmin(session.user)) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      ),
    };
  }
  return { ok: true };
}

/* ───── GET: 전문가 목록 (공개) ───── */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    /* 공개 페이지에서는 항상 활성 전문가만 노출 */
    /* 관리자용 전체 목록은 별도 관리자 API에서 처리 */
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get('showAll') === 'true';
    const listRequestResult = parseListRequest(searchParams, { defaultLimit: 24, maxLimit: 50 });
    if (listRequestResult.kind === 'invalid') {
      return NextResponse.json({ success: false, error: listRequestResult.message }, { status: 400 });
    }
    const { limit, cursor } = listRequestResult.request;
    let baseQuery: Record<string, unknown> = { isActive: true };
    let showPrivateData = false;

    if (showAll) {
      const session = await getServerSession(authOptions);
      const isAdminUser = session?.user ? isAdmin(session.user) : false;
      if (isAdminUser) {
        baseQuery = {};
        showPrivateData = true;
      } else {
        return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
      }
    }

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

    const transformedExperts = page.items.map((expert) => {
      const expertObj = expert.toObject();
      return {
        ...expertObj,
        imageUrl: expertObj.imageUrl || `/images/examiners/${expertObj.imageKey}.png`,
        imageAlt: `${expertObj.name} 전문가 사진`,
      };
    });

    return NextResponse.json(
      {
        success: true,
        experts: transformedExperts,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      },
      {
        headers: {
          'Cache-Control': showPrivateData
            ? 'private, no-store'
            : 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('[나라똔:전문가관리] 목록 조회 실패:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch experts' }, { status: 500 });
  }
}

/* ───── POST: 전문가 등록 (관리자 전용) ───── */
export async function POST(request: NextRequest) {
  const auth = await requireAdminSession();
  if (auth.ok === false) return auth.response;

  try {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { success: false, error: '잘못된 요청 형식입니다.' },
        { status: 400 }
      );
    }

    const expertData = pickAllowed(body);

    await dbConnect();

    const lastExpert = await Expert.findOne({}).sort({ order: -1 });
    const newOrder = lastExpert ? lastExpert.order + 1 : 0;

    const expert = await Expert.create({
      ...expertData,
      order: newOrder,
      isActive: true,
    });

    return NextResponse.json({ success: true, expert });
  } catch (error) {
    console.error('[나라똔:전문가관리] 등록 실패:', error);
    return NextResponse.json({ success: false, error: 'Failed to create expert' }, { status: 500 });
  }
}

/* ───── PUT: 전문가 수정 (관리자 전용) ───── */
export async function PUT(request: NextRequest) {
  const auth = await requireAdminSession();
  if (auth.ok === false) return auth.response;

  try {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { success: false, error: '잘못된 요청 형식입니다.' },
        { status: 400 }
      );
    }

    const { id } = body;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'Expert ID is required' }, { status: 400 });
    }

    const updateData = pickAllowed(body);

    await dbConnect();

    const expert = await Expert.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!expert) {
      return NextResponse.json({ success: false, error: 'Expert not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, expert });
  } catch (error) {
    console.error('[나라똔:전문가관리] 수정 실패:', error);
    return NextResponse.json({ success: false, error: 'Failed to update expert' }, { status: 500 });
  }
}

/* ───── DELETE: 전문가 삭제 (관리자 전용) ───── */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdminSession();
  if (auth.ok === false) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Expert ID is required' }, { status: 400 });
    }

    await dbConnect();

    const expert = await Expert.findByIdAndDelete(id);

    if (!expert) {
      return NextResponse.json({ success: false, error: 'Expert not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Expert deleted successfully' });
  } catch (error) {
    console.error('[나라똔:전문가관리] 삭제 실패:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete expert' }, { status: 500 });
  }
}
