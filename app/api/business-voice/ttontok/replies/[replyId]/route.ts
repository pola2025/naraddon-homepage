import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { getServerSession } from 'next-auth';

import connectDB from '@/lib/mongodb';
import TtontokReply from '@/models/TtontokReply';
import TtontokPost from '@/models/TtontokPost';
import { authOptions } from '@/lib/auth/authOptions';

const sanitizeContent = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 4000);
};

const sanitizeNickname = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 24);
};

export async function GET(
  request: NextRequest,
  context: { params: { replyId: string } }
) {
  await connectDB();

  const { replyId } = context.params;
  if (!replyId || !Types.ObjectId.isValid(replyId)) {
    return NextResponse.json({ message: '댓글 ID가 올바르지 않습니다.' }, { status: 400 });
  }

  const reply = await TtontokReply.findById(replyId).lean();

  if (!reply) {
    return NextResponse.json({ message: '댓글을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({
    id: reply._id,
    postId: reply.postId,
    content: reply.content,
    nickname: reply.nickname,
    role: reply.role,
    isAccepted: reply.isAccepted,
    likeCount: reply.likeCount,
    createdAt: reply.createdAt,
    updatedAt: reply.updatedAt,
  });
}

/**
 * 똔톡 댓글 수정
 *
 * @purpose 관리자만 댓글을 수정할 수 있도록 권한 검증
 * @context NextAuth 세션 기반 인증으로 admin 역할 확인
 * @security CRITICAL - 이전에는 권한 검증이 없어서 누구나 수정 가능했음
 */
export async function PATCH(
  request: NextRequest,
  context: { params: { replyId: string } }
) {
  await connectDB();

  // 관리자 권한 검증
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { message: '로그인이 필요합니다.' },
      { status: 401 }
    );
  }

  const userRole = (session.user as any)?.role;
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return NextResponse.json(
      { message: '관리자 권한이 필요합니다.' },
      { status: 403 }
    );
  }

  const { replyId } = context.params;
  if (!replyId || !Types.ObjectId.isValid(replyId)) {
    return NextResponse.json({ message: '댓글 ID가 올바르지 않습니다.' }, { status: 400 });
  }

  const reply = await TtontokReply.findById(replyId);
  if (!reply) {
    return NextResponse.json({ message: '댓글을 찾을 수 없습니다.' }, { status: 404 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch (error) {
    console.error('[ttontok] invalid update payload', error);
    return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 400 });
  }

  const updates: any = {};

  if ('content' in payload) {
    const content = sanitizeContent(payload.content);
    if (content) updates.content = content;
  }

  if ('nickname' in payload) {
    const nickname = sanitizeNickname(payload.nickname);
    if (nickname) updates.nickname = nickname;
  }

  if ('role' in payload && typeof payload.role === 'string') {
    updates.role = payload.role;
  }

  if ('isAccepted' in payload && typeof payload.isAccepted === 'boolean') {
    updates.isAccepted = payload.isAccepted;
  }

  if ('likeCount' in payload && typeof payload.likeCount === 'number') {
    updates.likeCount = Math.max(0, payload.likeCount);
  }

  if ('createdAt' in payload) {
    const date = new Date(payload.createdAt as string);
    if (!isNaN(date.getTime())) {
      updates.createdAt = date;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ message: '업데이트할 내용이 없습니다.' }, { status: 400 });
  }

  updates.updatedAt = new Date();

  try {
    const updated = await TtontokReply.findByIdAndUpdate(
      replyId,
      updates,
      { new: true, runValidators: true }
    ).lean();

    console.log(`[ttontok] Reply updated by admin: ${session.user.email}, replyId: ${replyId}`);

    return NextResponse.json({
      id: updated._id,
      postId: updated.postId,
      content: updated.content,
      nickname: updated.nickname,
      role: updated.role,
      isAccepted: updated.isAccepted,
      likeCount: updated.likeCount,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('[ttontok] failed to update reply', error);
    return NextResponse.json({ message: '댓글 수정에 실패했습니다.' }, { status: 500 });
  }
}

/**
 * 똔톡 댓글 삭제
 *
 * @purpose 관리자만 댓글을 삭제할 수 있도록 권한 검증
 * @context NextAuth 세션 기반 인증으로 admin 역할 확인
 * @security CRITICAL - 이전에는 권한 검증이 없어서 누구나 삭제 가능했음
 */
export async function DELETE(
  request: NextRequest,
  context: { params: { replyId: string } }
) {
  await connectDB();

  // 관리자 권한 검증
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { message: '로그인이 필요합니다.' },
      { status: 401 }
    );
  }

  const userRole = (session.user as any)?.role;
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return NextResponse.json(
      { message: '관리자 권한이 필요합니다.' },
      { status: 403 }
    );
  }

  const { replyId } = context.params;
  if (!replyId || !Types.ObjectId.isValid(replyId)) {
    return NextResponse.json({ message: '댓글 ID가 올바르지 않습니다.' }, { status: 400 });
  }

  const reply = await TtontokReply.findById(replyId);
  if (!reply) {
    return NextResponse.json({ message: '댓글을 찾을 수 없습니다.' }, { status: 404 });
  }

  try {
    await TtontokReply.findByIdAndDelete(replyId);

    // 게시글의 댓글 수 감소
    await TtontokPost.findByIdAndUpdate(
      reply.postId,
      { $inc: { replyCount: -1 } }
    );

    console.log(`[ttontok] Reply deleted by admin: ${session.user.email}, replyId: ${replyId}`);

    return NextResponse.json({ message: '댓글이 삭제되었습니다.' });
  } catch (error) {
    console.error('[ttontok] failed to delete reply', error);
    return NextResponse.json({ message: '댓글 삭제에 실패했습니다.' }, { status: 500 });
  }
}
