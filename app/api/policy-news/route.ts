import { NextRequest, NextResponse } from 'next/server';
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
    const body = await request.json();
    const { password, title, content, category, excerpt, thumbnail, tags, isMain, isPinned, badge } = body;

    // Referer 헤더 확인 - 관리자 페이지에서 오는 요청인지 체크
    const referer = request.headers.get('referer') || '';
    const isFromAdmin = referer.includes('/policy-news/admin') || referer.includes('/policy-news/write');

    // 관리자 페이지에서 오지 않은 요청만 비밀번호 검증
    if (!isFromAdmin) {
      const adminPassword = process.env.POLICY_NEWS_PASSWORD;
      if (!adminPassword) {
        return NextResponse.json({ message: '게시글 비밀번호가 설정되지 않았습니다.' }, { status: 500 });
      }

      if (!password || password !== adminPassword) {
        return NextResponse.json({ message: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
      }
    }

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
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('[policy-news][POST]', error);
    return NextResponse.json({ message: '게시글을 등록하지 못했습니다.' }, { status: 500 });
  }
}
