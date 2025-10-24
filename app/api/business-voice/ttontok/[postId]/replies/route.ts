import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { requireLogin , handleAuthError } from '@/lib/auth/guards';

import connectDB from '@/lib/mongodb';
import TtontokPost from '@/models/TtontokPost';
import TtontokReply, { TtontokReplyRole } from '@/models/TtontokReply';

const sanitizeContent = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 4000);
};

const sanitizeNickname = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 24);
};

const sanitizeCompanyName = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 50);
};

const parseRole = (value: unknown): TtontokReplyRole => {
  if (typeof value !== 'string') return 'general';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'certified_examiner' || normalized === 'expert') {
    return normalized;
  }
  return 'general';
};

const toObjectId = (value: unknown): Types.ObjectId | undefined => {
  if (typeof value !== 'string' || value.trim().length === 0) return undefined;
  if (!Types.ObjectId.isValid(value)) return undefined;
  return new Types.ObjectId(value);
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
  const sortOrder = (searchParams.get('sort') ?? 'chronological').toLowerCase();
  const sort = sortOrder === 'recent' ? { createdAt: -1 } : { createdAt: 1 };

  const replies = await TtontokReply.find({ postId })
    .sort(sort)
    .lean();

  return NextResponse.json(
    replies.map((reply) => ({
      id: reply._id,
      content: reply.content,
      nickname: reply.nickname,
      companyName: reply.companyName,
      role: reply.role,
      isAccepted: reply.isAccepted,
      likeCount: reply.likeCount,
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt,
    }))
  );
}

export async function POST(
  request: NextRequest,
  context: { params: { postId: string } }
) {
  // 🔒 로그인 필수 - 일반 사용자도 답글 작성 가능
  const user = await requireLogin();

  await connectDB();

  const { postId } = context.params;
  if (!postId || !Types.ObjectId.isValid(postId)) {
    return NextResponse.json({ message: '게시글 ID가 올바르지 않습니다.' }, { status: 400 });
  }

  const post = await TtontokPost.findById(postId);
  if (!post || post.isArchived) {
    return NextResponse.json({ message: '게시글을 찾을 수 없습니다.' }, { status: 404 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch (error) {
    console.error('[ttontok] invalid reply payload', error);

    // uc778uc99d/uad8cud55c uc5d0ub7ec ucc98ub9ac
    const authError = handleAuthError(error);
    if (authError) return authError;
    return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 400 });
  }

  const content = sanitizeContent(payload.content);
  const nickname = sanitizeNickname(payload.nickname);
  const companyName = sanitizeCompanyName(payload.companyName);
  const role = parseRole(payload.role);
  const memberId = toObjectId(payload.memberId);

  if (!content || !nickname) {
    return NextResponse.json({ message: '내용과 닉네임을 입력해 주세요.' }, { status: 400 });
  }

  try {
    const created = await TtontokReply.create({
      postId: post._id,
      content,
      nickname,
      companyName,
      role,
      memberId,
    });

    await TtontokPost.findByIdAndUpdate(post._id, { $inc: { replyCount: 1 } }).exec();

    /**
     * 답글 작성 활동 기록
     *
     * @purpose examiner 역할 사용자의 답글 작성 활동 추적
     * @context 답글 작성 성공 후 활동 점수 기록
     */
    try {
      if (user.email) {
        const { db } = await import('@/lib/mongodb');
        const dbInstance = (await db()).db;

        const dbUser = await dbInstance.collection('users').findOne({ email: user.email });

        if (dbUser && dbUser.role === 'examiner') {
          const examiner = await dbInstance.collection('expert-examiners').findOne({
            userId: dbUser._id.toString()
          });

          if (examiner) {
            console.log('[TtonTok Reply] Recording comment activity for examiner:', examiner.name);

            await fetch(`${process.env.NEXTAUTH_URL}/api/admin/examiners/${examiner._id.toString()}/activities`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ activityType: 'commentCreated', increment: 1 })
            });

            console.log('[TtonTok Reply] Comment activity recorded successfully');
          }
        }
      }
    } catch (activityError) {
      console.error('[TtonTok Reply] Failed to record comment activity:', activityError);
      // 활동 기록 실패해도 답글 작성은 성공으로 처리
    }

    return NextResponse.json(
      {
        id: created._id,
        content: created.content,
        nickname: created.nickname,
        companyName: created.companyName,
        role: created.role,
        isAccepted: created.isAccepted,
        likeCount: created.likeCount,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[ttontok] failed to create reply', error);

    // uc778uc99d/uad8cud55c uc5d0ub7ec ucc98ub9ac
    const authError = handleAuthError(error);
    if (authError) return authError;
    return NextResponse.json({ message: '댓글을 저장하지 못했습니다.' }, { status: 500 });
  }
}