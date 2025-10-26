import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth-options';
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

    // 권한 확인: 관리자 또는 기업심사관만 수정/삭제 가능
    const userRole = (session.user as any)?.role;
    const userEmail = (session.user as any)?.email;

    if (userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'examiner') {
      return NextResponse.json({ message: '권한이 없습니다. 관리자 또는 기업심사관 역할이 필요합니다.' }, { status: 403 });
    }

    await connectDB();

    /**
     * 작성자 권한 체크
     *
     * @purpose 관리자는 모든 게시글 수정 가능, 작성자는 본인 게시글만 수정 가능
     * @context author.email과 현재 사용자 email 비교
     */
    const existingPost = await PolicyNewsPost.findById(params.id);
    if (!existingPost) {
      return NextResponse.json({ message: '존재하지 않는 게시글입니다.' }, { status: 404 });
    }

    // 관리자가 아니고, 작성자도 아닌 경우 권한 없음
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isAuthor = existingPost.author?.email === userEmail;

    if (!isAdmin && !isAuthor) {
      return NextResponse.json({
        message: '본인이 작성한 게시글만 수정할 수 있습니다.',
        debug: {
          userEmail,
          authorEmail: existingPost.author?.email,
          userRole
        }
      }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, category, excerpt, thumbnail, tags, isMain, isPinned, badge, views } = body;

    if (!title || !title.trim() || !content || !content.trim()) {
      return NextResponse.json({ message: '제목과 내용을 입력해주세요.' }, { status: 400 });
    }

    const normalizedTags = Array.isArray(tags)
      ? tags
      : typeof tags === 'string'
      ? tags
          .split(',')
          .map((tag: string) => tag.trim())
          .filter(Boolean)
      : [];

    /**
     * 업데이트 데이터 생성
     *
     * @purpose 관리자가 게시글 수정 시 조회수도 함께 업데이트 가능하도록 함
     * @context views가 제공된 경우에만 업데이트
     */
    const updateData: any = {
      title: title.trim(),
      content,
      category: category?.trim() || '기타',
      excerpt: excerpt?.trim() || '',
      thumbnail: thumbnail?.trim() || '',
      tags: normalizedTags,
      isMain: Boolean(isMain),
      isPinned: Boolean(isPinned),
      badge: badge?.trim() || '',
    };

    if (typeof views === 'number' && views >= 0) {
      updateData.views = views;
    }

    const updated = await PolicyNewsPost.findByIdAndUpdate(
      params.id,
      updateData,
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

    // 권한 확인: 관리자 또는 기업심사관만 수정/삭제 가능
    const userRole = (session.user as any)?.role;
    const userEmail = (session.user as any)?.email;

    if (userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'examiner') {
      return NextResponse.json({ message: '권한이 없습니다. 관리자 또는 기업심사관 역할이 필요합니다.' }, { status: 403 });
    }

    await connectDB();

    // 작성자 권한 체크 (관리자는 모든 게시글 삭제 가능)
    const existingPost = await PolicyNewsPost.findById(params.id);
    if (!existingPost) {
      return NextResponse.json({ message: '존재하지 않는 게시글입니다.' }, { status: 404 });
    }

    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isAuthor = existingPost.author?.email === userEmail;

    if (!isAdmin && !isAuthor) {
      return NextResponse.json({
        message: '본인이 작성한 게시글만 삭제할 수 있습니다.'
      }, { status: 403 });
    }

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
