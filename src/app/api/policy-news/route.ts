import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PolicyNewsPost from '@/models/PolicyNewsPost';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/auth-options';
import { checkPermission } from '@/lib/rbac/check-permission';
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

    // CDN 캐싱 헤더 설정 (5분 캐싱)
    return NextResponse.json(
      { posts },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'CDN-Cache-Control': 'public, max-age=300',
          'Vercel-CDN-Cache-Control': 'public, max-age=300',
        },
      }
    );
  } catch (error) {
    console.error('[policy-news][GET]', error);
    return NextResponse.json({ message: '게시글을 불러오지 못했습니다.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // 1. NextAuth 세션 확인 (RBAC 권한)
    const session = await getServerSession(authOptions);
    let hasPermission = false;
    let authMethod = 'none';

    // 2. RBAC 권한 확인 (examiner 또는 admin)
    if (session?.user?.id) {
      const canWrite = await checkPermission(
        session.user.id,
        'policy:news:write'
      );

      if (canWrite) {
        hasPermission = true;
        authMethod = 'rbac';
      }
    }

    // 3. 레거시 admin 세션 확인 (하위 호환성)
    if (!hasPermission) {
      const isAdmin = await validateAdminSession();
      if (isAdmin) {
        hasPermission = true;
        authMethod = 'admin-session';
      }
    }

    // 4. 권한 없으면 403 반환
    if (!hasPermission) {
      return NextResponse.json(
        {
          message: '정책뉴스 작성 권한이 없습니다. 기업심사관 또는 관리자만 작성할 수 있습니다.',
          authMethod,
          hasSession: !!session
        },
        { status: 403 }
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
