import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import PolicyNewsPost from '@/models/PolicyNewsPost';

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

    // NextAuth 세션 확인
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 관리자 권한 확인
    const userRole = (session.user as any)?.role;
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({ message: '관리자 권한이 필요합니다.' }, { status: 403 });
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

    // NextAuth 세션 확인
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 관리자 권한 확인
    const userRole = (session.user as any)?.role;
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({ message: '관리자 권한이 필요합니다.' }, { status: 403 });
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
