import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth-options';
import connectDB from '@/lib/mongodb';
import Short from '@/models/Short';
import { isAdmin } from '@/lib/auth/role-check';
import { buildAscendingCursorFilter, parseListRequest, takePage } from '@/lib/bounded-read';

// GET: 활성 쇼츠 목록 (프론트용) 또는 전체 목록 (관리자용)
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const all = searchParams.get('all') === '1' || searchParams.get('all') === 'true';
    const listRequestResult = parseListRequest(searchParams, { defaultLimit: 24, maxLimit: 50 });
    if (listRequestResult.kind === 'invalid') {
      return NextResponse.json({ error: listRequestResult.message }, { status: 400 });
    }
    const { limit, cursor } = listRequestResult.request;

    if (all) {
      const session = await getServerSession(authOptions);
      if (!session?.user || !isAdmin(session.user)) {
        return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
      }
    }

    const baseQuery: Record<string, unknown> = all ? {} : { isActive: true };
    const cursorFilter = cursor ? buildAscendingCursorFilter(cursor, 'sortOrder') : null;
    const query = cursorFilter ? { $and: [baseQuery, cursorFilter] } : baseQuery;
    const shorts = await Short.find(query)
      .sort({ sortOrder: 1, _id: 1 })
      .limit(limit + 1)
      .lean();
    const page = takePage(shorts, limit, (short) => ({
      sortValue: Number(short.sortOrder || 0),
      id: short._id.toString(),
    }));

    return NextResponse.json(
      { shorts: page.items, nextCursor: page.nextCursor, hasMore: page.hasMore },
      {
        headers: {
          'Cache-Control': all
            ? 'private, no-store'
            : 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('Shorts GET error:', error);
    return NextResponse.json({ error: '쇼츠 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// POST: 새 쇼츠 등록 (관리자 전용)
export async function POST(req: NextRequest) {
  // 인증 체크
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    await connectDB();

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
    }
    const { title, youtubeUrl, thumbnailUrl, sortOrder } = body;

    if (!youtubeUrl) {
      return NextResponse.json({ error: '유튜브 URL은 필수입니다.' }, { status: 400 });
    }

    // 썸네일이 없으면 YouTube 세로 썸네일 자동 생성 (frame0 = 9:16 원본 비율)
    let finalThumbnail = thumbnailUrl || '';
    if (!finalThumbnail) {
      const idMatch = youtubeUrl.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
      );
      if (idMatch) {
        finalThumbnail = `https://i.ytimg.com/vi/${idMatch[1]}/frame0.jpg`;
      }
    }

    // 제목이 없으면 URL에서 자동 생성
    const autoTitle = title || `쇼츠 ${new Date().toLocaleDateString('ko-KR')}`;

    const short = await Short.create({
      title: autoTitle,
      youtubeUrl,
      thumbnailUrl: finalThumbnail,
      sortOrder: sortOrder ?? 0,
    });

    return NextResponse.json(
      {
        message: '쇼츠가 등록되었습니다.',
        short,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Shorts POST error:', error);
    return NextResponse.json({ error: '쇼츠 등록 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
