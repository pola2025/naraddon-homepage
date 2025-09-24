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

    const post = await DDonTalk.findById(params.id);

    if (!post) {
      return NextResponse.json(
        { success: false, error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    post.comments.push({
      author,
      content,
      createdAt: new Date()
    });

    await post.save();

    return NextResponse.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('댓글 추가 오류:', error);
    return NextResponse.json(
      { success: false, error: '댓글 작성에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 댓글 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json(
        { success: false, error: '댓글 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const post = await DDonTalk.findById(params.id);

    if (!post) {
      return NextResponse.json(
        { success: false, error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    post.comments = post.comments.filter(
      (comment: any) => comment._id.toString() !== commentId
    );

    await post.save();

    return NextResponse.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('댓글 삭제 오류:', error);
    return NextResponse.json(
      { success: false, error: '댓글 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}