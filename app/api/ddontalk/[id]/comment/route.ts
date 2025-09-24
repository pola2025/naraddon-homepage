import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DDonTalk from '@/models/DDonTalk';

// POST: 댓글 추가
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const body = await request.json();
    const { author, content } = body;

    if (!author || !content) {
      return NextResponse.json(
        { success: false, error: '작성자와 내용을 입력해주세요.' },
        { status: 400 }
      );
    }

    const newComment = {
      author,
      content,
      createdAt: new Date()
    };

    const post = await DDonTalk.findByIdAndUpdate(
      params.id,
      {
        $push: { comments: newComment },
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!post) {
      return NextResponse.json(
        { success: false, error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      post
    });
  } catch (error) {
    console.error('댓글 추가 오류:', error);
    return NextResponse.json(
      { success: false, error: '댓글 추가에 실패했습니다.' },
      { status: 500 }
    );
  }
}