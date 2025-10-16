import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { verifyAdminRole } from '../../../lib/auth/verifyAdminRole';
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
    // 세션 및 DB 기반 이중 권한 검증
    const verification = await verifyAdminRole(['admin', 'super_admin', 'examiner']);

    console.log('[policy-news][POST] Verification result:', {
      isAuthorized: verification.isAuthorized,
      user: verification.user,
      debugInfo: verification.debugInfo
    });

    if (!verification.isAuthorized) {
      return NextResponse.json(
        {
          message: verification.error || '권한이 없습니다.',
          debugInfo: verification.debugInfo
        },
        { status: verification.error?.includes('로그인') ? 401 : 403 }
      );
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
