import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';

import connectDB from '@/lib/mongodb';
import TtontokPost from '@/models/TtontokPost';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: '잘못된 게시글 ID입니다.' }, { status: 400 });
  }

  await connectDB();

  const post = await TtontokPost.findById(id).lean();

  if (!post) {
    return NextResponse.json({ message: '게시글을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({
    post: {
      ...post,
      _id: post._id.toString(),
      createdAt: post.createdAt?.toISOString() ?? null,
      updatedAt: post.updatedAt?.toISOString() ?? null,
      draftExpiresAt: (post as any).draftExpiresAt?.toISOString() ?? null,
    },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: '잘못된 게시글 ID입니다.' }, { status: 400 });
  }

  const { incrementViews } = await request.json();

  await connectDB();

  const update: { $inc?: { views: number } } = {};
  if (incrementViews) {
    update.$inc = { views: 1 };
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ message: '업데이트할 항목이 없습니다.' }, { status: 400 });
  }

  const post = await TtontokPost.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  }).lean();

  if (!post) {
    return NextResponse.json({ message: '게시글을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({
    post: {
      ...post,
      _id: post._id.toString(),
      createdAt: post.createdAt?.toISOString() ?? null,
      updatedAt: post.updatedAt?.toISOString() ?? null,
    },
  });
}

/**
 * PUT: 임시저장 글 수정 또는 공개 전환
 *
 * - isDraft=true: 임시저장 유지 (만료일 2일 연장)
 * - isDraft=false: 공개 전환 (만료일 제거, 자동삭제 안됨)
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: '잘못된 게시글 ID입니다.' }, { status: 400 });
  }

  await connectDB();

  const existingPost = await TtontokPost.findById(id);
  if (!existingPost) {
    return NextResponse.json({ message: '게시글을 찾을 수 없습니다.' }, { status: 404 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  const { title, content, category, isDraft, memberId, password } = body as {
    title?: string;
    content?: string;
    category?: string;
    isDraft?: boolean;
    memberId?: string;
    password?: string;
  };

  // 비밀번호 확인
  const WRITE_PASSWORD = process.env.TTONTOK_WRITE_PASSWORD;
  if (!password || password !== WRITE_PASSWORD) {
    return NextResponse.json({ message: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  // 본인 글인지 확인 (memberId가 있는 경우)
  if (existingPost.memberId && memberId && existingPost.memberId.toString() !== memberId) {
    return NextResponse.json({ message: '본인 글만 수정할 수 있습니다.' }, { status: 403 });
  }

  // 공개 전환 시 필수 체크
  if (!isDraft) {
    if (!title || title.trim().length === 0) {
      return NextResponse.json({ message: '제목을 입력해주세요.' }, { status: 400 });
    }
    if (!content || content.trim().length < 30) {
      return NextResponse.json({ message: '내용은 최소 30자 이상 입력해주세요.' }, { status: 400 });
    }
  }

  // 업데이트 데이터
  const updateData: Record<string, unknown> = {
    title: title?.trim() || existingPost.title,
    content: content?.trim() || existingPost.content,
    category: category || existingPost.category,
    isDraft: Boolean(isDraft),
    updatedAt: new Date(),
  };

  // 공개 전환 시 만료일 제거 (자동삭제 안됨)
  if (!isDraft) {
    updateData.draftExpiresAt = null;
  } else {
    // 임시저장 유지 시 만료일 갱신 (2일 연장)
    updateData.draftExpiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  }

  const updatedPost = await TtontokPost.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).lean();

  return NextResponse.json({
    post: {
      ...updatedPost,
      _id: updatedPost!._id.toString(),
      createdAt: updatedPost!.createdAt?.toISOString() ?? null,
      updatedAt: updatedPost!.updatedAt?.toISOString() ?? null,
      draftExpiresAt: (updatedPost as any)?.draftExpiresAt?.toISOString() ?? null,
    },
  });
}
