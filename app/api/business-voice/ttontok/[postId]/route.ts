import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';

import connectDB from '@/lib/mongodb';
import TtontokPost from '@/models/TtontokPost';
import TtontokReply from '@/models/TtontokReply';

const DEFAULT_REPLY_LIMIT = 20;

const sanitizeString = (value: unknown, { maxLength = 500 }: { maxLength?: number } = {}) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
};

const sanitizeTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
        .filter((tag) => tag.length > 0)
        .slice(0, 10)
    )
  );
};

export async function GET(
  request: NextRequest,
  context: { params: { postId: string } }
) {
  await connectDB();

  const { postId } = context.params;
  if (!postId || !Types.ObjectId.isValid(postId)) {
    return NextResponse.json({ message: '게시글 ID가 올바르지 않습니다.' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const includeReplies = (searchParams.get('includeReplies') ?? 'true') !== 'false';
  const replyLimit = Math.max(1, Math.min(Number(searchParams.get('replyLimit')) || DEFAULT_REPLY_LIMIT, 100));

  const post = await TtontokPost.findById(postId).lean();
  if (!post || post.isArchived) {
    return NextResponse.json({ message: '게시글을 찾을 수 없습니다.' }, { status: 404 });
  }

  const response: Record<string, unknown> = {
    id: post._id,
    title: post.title,
    content: post.content,
    category: post.category,
    nickname: post.nickname,
    tags: post.tags,
    viewCount: post.viewCount,
    likeCount: post.likeCount,
    replyCount: post.replyCount,
    isBest: post.isBest,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };

  if (includeReplies) {
    const replies = await TtontokReply.find({ postId: post._id })
      .sort({ order: 1, createdAt: 1 })
      .limit(replyLimit)
      .lean();

    response.replies = replies.map((reply) => ({
      id: reply._id,
      content: reply.content,
      nickname: reply.nickname,
      companyName: reply.companyName,
      role: reply.role,
      isAccepted: reply.isAccepted,
      likeCount: reply.likeCount,
      order: reply.order,
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt,
    }));
  }

  return NextResponse.json(response);
}

export async function PATCH(
  request: NextRequest,
  context: { params: { postId: string } }
) {
  await connectDB();

  const { postId } = context.params;
  if (!postId || !Types.ObjectId.isValid(postId)) {
    return NextResponse.json({ message: '게시글 ID가 올바르지 않습니다.' }, { status: 400 });
  }

  // Admin authentication check
  const isAdminRequest = request.headers.get('x-admin-auth') === 'true';
  if (!isAdminRequest) {
    return NextResponse.json({ message: '권한이 없습니다.' }, { status: 401 });
  }

  const post = await TtontokPost.findById(postId);
  if (!post || post.isArchived) {
    return NextResponse.json({ message: '게시글을 찾을 수 없습니다.' }, { status: 404 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch (error) {
    console.error('[ttontok] invalid update payload', error);
    return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 400 });
  }

  const updates: any = {};

  if ('title' in payload) {
    const title = sanitizeString(payload.title, { maxLength: 200 });
    if (title) updates.title = title;
  }

  if ('content' in payload) {
    const content = sanitizeString(payload.content, { maxLength: 5000 });
    if (content) updates.content = content;
  }

  if ('nickname' in payload) {
    const nickname = sanitizeString(payload.nickname, { maxLength: 24 });
    if (nickname) updates.nickname = nickname;
  }

  if ('category' in payload && typeof payload.category === 'string') {
    updates.category = payload.category;
  }

  if ('tags' in payload) {
    updates.tags = sanitizeTags(payload.tags);
  }

  if ('viewCount' in payload && typeof payload.viewCount === 'number') {
    updates.viewCount = Math.max(0, payload.viewCount);
  }

  if ('likeCount' in payload && typeof payload.likeCount === 'number') {
    updates.likeCount = Math.max(0, payload.likeCount);
  }

  if ('isBest' in payload && typeof payload.isBest === 'boolean') {
    updates.isBest = payload.isBest;
  }

  if ('createdAt' in payload) {
    const dateValue = payload.createdAt as string;
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      updates.createdAt = date;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ message: '업데이트할 내용이 없습니다.' }, { status: 400 });
  }

  updates.updatedAt = new Date();

  try {
    const updated = await TtontokPost.findByIdAndUpdate(
      postId,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    return NextResponse.json({
      id: updated._id,
      title: updated.title,
      content: updated.content,
      category: updated.category,
      nickname: updated.nickname,
      tags: updated.tags,
      viewCount: updated.viewCount,
      likeCount: updated.likeCount,
      replyCount: updated.replyCount,
      isBest: updated.isBest,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('[ttontok] failed to update post', error);
    return NextResponse.json({ message: '게시글 수정에 실패했습니다.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { postId: string } }
) {
  await connectDB();

  const { postId } = context.params;
  if (!postId || !Types.ObjectId.isValid(postId)) {
    return NextResponse.json({ message: '게시글 ID가 올바르지 않습니다.' }, { status: 400 });
  }

  // Admin authentication check
  const isAdminRequest = request.headers.get('x-admin-auth') === 'true';
  if (!isAdminRequest) {
    return NextResponse.json({ message: '권한이 없습니다.' }, { status: 401 });
  }

  const post = await TtontokPost.findById(postId);
  if (!post) {
    return NextResponse.json({ message: '게시글을 찾을 수 없습니다.' }, { status: 404 });
  }

  try {
    // 관련 댓글 모두 삭제
    await TtontokReply.deleteMany({ postId: post._id });

    // 게시글 삭제 (실제로는 isArchived를 true로 설정)
    await TtontokPost.findByIdAndUpdate(postId, { isArchived: true });

    return NextResponse.json({ message: '게시글이 삭제되었습니다.' });
  } catch (error) {
    console.error('[ttontok] failed to delete post', error);
    return NextResponse.json({ message: '게시글 삭제에 실패했습니다.' }, { status: 500 });
  }
}