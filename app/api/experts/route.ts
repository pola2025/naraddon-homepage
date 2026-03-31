import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth-options';
import { isAdmin } from '@/lib/auth/role-check';
import dbConnect from '@/lib/mongodb';
import Expert from '@/models/Expert';

/**
 * 전문가 관리 API
 *
 * @purpose 전문가 목록 조회(공개) / 등록·수정·삭제(관리자 전용)
 * @security POST/PUT/DELETE는 NextAuth 세션 + 관리자 권한 필수
 */

/* 허용 필드 allowlist — MongoDB에 직접 전달되므로 명시적으로 제한 */
const ALLOWED_EXPERT_FIELDS = [
  'name',
  'title',
  'imageKey',
  'imageUrl',
  'specialty',
  'bio',
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

    /* 관리자 세션이 있으면 전체, 없으면 활성 전문가만 */
    const session = await getServerSession(authOptions);
    const isAdminUser = session?.user ? isAdmin(session.user) : false;
    const query = isAdminUser ? {} : { isActive: true };

    const experts = await Expert.find(query).sort({ order: 1, createdAt: -1 }).select('-__v');

    const transformedExperts = experts.map((expert) => {
      const expertObj = expert.toObject();
      return {
        ...expertObj,
        imageUrl: expertObj.imageUrl || `/images/examiners/${expertObj.imageKey}.png`,
        imageAlt: `${expertObj.name} 전문가 사진`,
      };
    });

    return NextResponse.json({ success: true, experts: transformedExperts });
  } catch (error) {
    console.error('[나라똔:전문가관리] 목록 조회 실패:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch experts' }, { status: 500 });
  }
}

/* ───── POST: 전문가 등록 (관리자 전용) ───── */
export async function POST(request: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

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
  if (!auth.ok) return auth.response;

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
  if (!auth.ok) return auth.response;

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
