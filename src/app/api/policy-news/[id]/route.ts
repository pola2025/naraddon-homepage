import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import PolicyNewsPost from '@/models/PolicyNewsPost';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { checkPermission } from '@/lib/rbac/check-permission';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ message: '존재하지 않는 게시글입니다.' }, { status: 404 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const increaseView = searchParams.get('countView') === 'true';

    const post = await PolicyNewsPost.findByIdAndUpdate(
      params.id,
      increaseView ? { $inc: { views: 1 } } : {},
      { new: true }
    ).lean();

    if (!post) {
      return NextResponse.json({ message: '존재하지 않는 게시글입니다.' }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('[policy-news][GET:id]', error);
    return NextResponse.json({ message: '게시글을 불러오지 못했습니다.' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ message: '존재하지 않는 게시글입니다.' }, { status: 404 });
    }

    // 본문 먼저 파싱
    const body = await request.json();
    const { password, title, content, category, excerpt, thumbnail, tags, isMain, isPinned, badge } = body;

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

    // 3. 레거시 비밀번호 인증 (하위 호환성)
    if (!hasPermission) {
      const adminPassword = process.env.POLICY_NEWS_PASSWORD;
      if (adminPassword && password && password === adminPassword) {
        hasPermission = true;
        authMethod = 'password';
      }
    }

    // 4. 권한 없으면 403 반환
    if (!hasPermission) {
      return NextResponse.json(
        {
          message: '정책뉴스 수정 권한이 없습니다. 기업심사관 또는 관리자만 수정할 수 있습니다.',
          authMethod,
          hasSession: !!session
        },
        { status: 403 }
      );
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

    const updated = await PolicyNewsPost.findByIdAndUpdate(
      params.id,
      {
        title: title.trim(),
        content,
        category: category?.trim() || '기타',
        excerpt: excerpt?.trim() || '',
        thumbnail: thumbnail?.trim() || '',
        tags: normalizedTags,
        isMain: Boolean(isMain),
        isPinned: Boolean(isPinned),
        badge: badge?.trim() || '',
      },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ message: '존재하지 않는 게시글입니다.' }, { status: 404 });
    }

    return NextResponse.json({ post: updated });
  } catch (error) {
    console.error('[policy-news][PUT:id]', error);
    return NextResponse.json({ message: '게시글을 수정하지 못했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ message: '존재하지 않는 게시글입니다.' }, { status: 404 });
    }

    // 본문 먼저 파싱
    const body = await request.json().catch(() => ({}));
    const { password } = body as { password?: string };

    // 1. NextAuth 세션 확인 (RBAC 권한)
    const session = await getServerSession(authOptions);
    let hasPermission = false;
    let authMethod = 'none';

    // 2. RBAC 권한 확인 (admin만 가능 - 삭제는 관리자 전용)
    if (session?.user?.id) {
      const canManage = await checkPermission(
        session.user.id,
        'community:post:manage'  // 관리자만 삭제 가능
      );

      if (canManage) {
        hasPermission = true;
        authMethod = 'rbac';
      }
    }

    // 3. 레거시 비밀번호 인증 (하위 호환성)
    if (!hasPermission) {
      const adminPassword = process.env.POLICY_NEWS_PASSWORD;
      if (adminPassword && password && password === adminPassword) {
        hasPermission = true;
        authMethod = 'password';
      }
    }

    // 4. 권한 없으면 403 반환
    if (!hasPermission) {
      return NextResponse.json(
        {
          message: '정책뉴스 삭제 권한이 없습니다. 관리자만 삭제할 수 있습니다.',
          authMethod,
          hasSession: !!session
        },
        { status: 403 }
      );
    }

    await connectDB();

    const deleted = await PolicyNewsPost.findByIdAndDelete(params.id).lean();
    if (!deleted) {
      return NextResponse.json({ message: '존재하지 않는 게시글입니다.' }, { status: 404 });
    }

    return NextResponse.json({ message: '삭제되었습니다.' });
  } catch (error) {
    console.error('[policy-news][DELETE:id]', error);
    return NextResponse.json({ message: '게시글을 삭제하지 못했습니다.' }, { status: 500 });
  }
}
