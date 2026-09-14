import { NextRequest, NextResponse } from 'next/server';
import { requireLogin , handleAuthError } from '@/lib/auth/guards';
import connectDB from '@/lib/mongodb';
import DDonTalk from '@/models/DDonTalk';
import {
  buildDescendingDateCursorFilter,
  parseListRequest,
  takePage,
} from '@/lib/bounded-read';

// GET: 똔톡 목록 조회
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const listRequestResult = parseListRequest(searchParams, { defaultLimit: 20, maxLimit: 50 });
    if (listRequestResult.kind === 'invalid') {
      return NextResponse.json({ success: false, error: listRequestResult.message }, { status: 400 });
    }
    const { limit, cursor } = listRequestResult.request;
    const cursorFilterResult = cursor
      ? buildDescendingDateCursorFilter(cursor, 'createdAt')
      : { kind: 'valid' as const, filter: {} };
    if (cursorFilterResult.kind === 'invalid') {
      return NextResponse.json({ success: false, error: 'cursor is invalid' }, { status: 400 });
    }

    const posts = await DDonTalk.find(cursorFilterResult.filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();
    const page = takePage(posts, limit, (post) => ({
      sortValue: new Date(post.createdAt).toISOString(),
      id: post._id.toString(),
    }));

    // 베스트 게시글 선택 (좋아요 수 기준 상위 2개)
    const bestPosts = await DDonTalk.find()
      .sort({ likes: -1 })
      .limit(2)
      .lean();

    return NextResponse.json(
      {
        success: true,
        posts: page.items,
        bestPosts,
        pagination: {
          limit,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } }
    );
  } catch (error) {
    console.error('DDonTalk 목록 조회 오류:', error);

    // uc778uc99d/uad8cud55c uc5d0ub7ec ucc98ub9ac
    const authError = handleAuthError(error);
    if (authError) return authError;
    return NextResponse.json(
      { success: false, error: '목록을 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
}

// POST: 새 똔톡 작성
export async function POST(request: NextRequest) {
  try {
    // 🔒 로그인 필수
    const user = await requireLogin();

    await connectDB();

    const body = await request.json();
    const { title, content, author, company } = body;

    // 유효성 검사
    if (!title || !content || !author || !company) {
      return NextResponse.json(
        { success: false, error: '필수 항목을 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    // 실제 회원 작성 시 글자 수 제한 없음

    const newPost = await DDonTalk.create({
      title,
      content,
      author,
      company,
      likes: 0,
      comments: []
    });

    // 텔레그램 알림 전송 (비동기로 실행, 실패해도 게시글 작성 진행)
    const { sendTelegramNotification } = await import('@/lib/notifications/telegram');
    sendTelegramNotification({
      type: 'examiner_post',
      data: {
        postType: 'ddontalk',
        authorEmail: user.email || 'unknown',
        authorName: user.name || author,
        title,
      },
    }).catch((error) => {
      console.error('[ddontalk] Telegram notification failed:', error);
    });

    return NextResponse.json({
      success: true,
      data: newPost
    }, { status: 201 });
  } catch (error) {
    console.error('DDonTalk 작성 오류:', error);

    // uc778uc99d/uad8cud55c uc5d0ub7ec ucc98ub9ac
    const authError = handleAuthError(error);
    if (authError) return authError;
    return NextResponse.json(
      { success: false, error: '게시글 작성에 실패했습니다.' },
      { status: 500 }
    );
  }
}
