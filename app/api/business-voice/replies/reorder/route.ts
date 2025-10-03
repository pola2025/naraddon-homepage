import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import TtontokReply from '@/models/TtontokReply';
import { Types } from 'mongoose';

export async function POST(request: Request) {
  try {
    const { postId, repliesOrder } = await request.json();

    if (!postId || !repliesOrder || !Array.isArray(repliesOrder)) {
      return NextResponse.json(
        { error: '올바른 데이터가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(postId)) {
      return NextResponse.json(
        { error: '올바르지 않은 게시물 ID입니다.' },
        { status: 400 }
      );
    }

    await connectDB();

    // 각 댓글에 순서(order) 필드 업데이트
    const updatePromises = repliesOrder.map((replyId, index) => {
      if (!Types.ObjectId.isValid(replyId)) {
        return Promise.resolve();
      }
      return TtontokReply.findByIdAndUpdate(
        replyId,
        { $set: { order: index } },
        { new: true }
      );
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: '댓글 순서가 성공적으로 저장되었습니다.'
    });
  } catch (error) {
    console.error('댓글 순서 조정 오류:', error);
    return NextResponse.json(
      { error: '댓글 순서 조정에 실패했습니다.' },
      { status: 500 }
    );
  }
}