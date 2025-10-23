import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { requirePolicyWriter , handleAuthError } from '@/lib/auth/guards';
import connectDB from '@/lib/mongodb';
import PolicyNewsPost from '@/models/PolicyNewsPost';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const mainOnly = searchParams.get('mainOnly') === 'true';

    const query = mainOnly ? { isMain: true } : {};
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const postsQuery = PolicyNewsPost.find(query).sort({ createdAt: -1 });
    if (limit && !Number.isNaN(limit)) {
      postsQuery.limit(limit);
    }

    const posts = await postsQuery.lean();

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('[policy-news][GET]', error);
    return NextResponse.json({ message: '게시글을 불러오지 못했습니다.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    /**
     * 정책소식 작성 권한 검증
     *
     * @purpose admin, super_admin, examiner만 정책소식 게시글 작성 가능
     * @context guards.ts의 requirePolicyWriter 사용 (통합된 권한 체계)
     */
    const user = await requirePolicyWriter();

    console.log('[policy-news][POST] User authenticated:', user.email, 'Role:', user.role);

    const body = await request.json();
    const { title, content, category, excerpt, thumbnail, tags, isMain, isPinned, badge } = body;

    if (!title || !title.trim() || !content || !content.trim()) {
      return NextResponse.json({ message: '제목과 내용을 입력해주세요.' }, { status: 400 });
    }

    await connectDB();

    const normalizedTags = Array.isArray(tags)
      ? tags
      : typeof tags === 'string'
      ? tags
          .split(',')
          .map((tag: string) => tag.trim())
          .filter(Boolean)
      : [];

    /**
     * 작성자 정보 저장
     *
     * @purpose 게시글 수정 권한 관리를 위해 작성자 정보 저장
     * @context 관리자는 모든 게시글 수정 가능, 작성자는 본인 게시글만 수정 가능
     */
    const post = await PolicyNewsPost.create({
      title: title.trim(),
      content,
      category: category?.trim() || '기타',
      excerpt: excerpt?.trim() || '',
      thumbnail: thumbnail?.trim() || '',
      tags: normalizedTags,
      isMain: Boolean(isMain),
      isPinned: Boolean(isPinned),
      badge: badge?.trim() || '',
      author: {
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('[policy-news][POST]', error);

    // 인증/권한 에러 처리
    const authError = handleAuthError(error);
    if (authError) return authError;

    return NextResponse.json({ message: '게시글을 등록하지 못했습니다.' }, { status: 500 });
  }
}
