import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PolicyNewsPost from '@/models/PolicyNewsPost';
import { validateAdminSession } from '@/lib/auth/admin-auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const mainOnly = searchParams.get('mainOnly') === 'true';
    const fieldsParam = searchParams.get('fields');

    const query = mainOnly ? { isMain: true } : {};
    // 기본 limit 설정 (성능 최적화)
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    // 필드 선택 (content 제외로 데이터 전송량 80% 감소)
    let postsQuery = PolicyNewsPost.find(query).sort({ createdAt: -1 });

    if (limit && !Number.isNaN(limit) && limit > 0) {
      postsQuery.limit(limit);
    }

    // 기본값을 minimal로 설정 (fieldsParam이 'full'일 때만 전체 반환)
    if (fieldsParam !== 'full') {
      postsQuery = postsQuery.select('-content');
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
    // 관리자 세션 확인
    const isAdmin = await validateAdminSession();
    if (!isAdmin) {
      return NextResponse.json({ message: '관리자 권한이 필요합니다.' }, { status: 401 });
    }

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
