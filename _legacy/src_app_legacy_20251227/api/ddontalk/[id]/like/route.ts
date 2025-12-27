import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import TtontokPost from '@/models/TtontokPost';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { action } = await request.json();

    if (!action || !['like', 'unlike'].includes(action)) {
      return NextResponse.json(
        { success: false, message: '잘못된 요청입니다.' },
        { status: 400 }
      );
    }

    await connectDB();

    const post = await TtontokPost.findById(params.id);

    if (!post) {
      return NextResponse.json(
        { success: false, message: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 좋아요 수 업데이트
    if (action === 'like') {
      post.likes = (post.likes || 0) + 1;
    } else {
      post.likes = Math.max((post.likes || 0) - 1, 0);
    }

    await post.save();

    return NextResponse.json({
      success: true,
      likes: post.likes,
      message: action === 'like' ? '좋아요를 눌렀습니다.' : '좋아요를 취소했습니다.'
    });

  } catch (error) {
    console.error('좋아요 처리 실패:', error);
    return NextResponse.json(
      { success: false, message: '좋아요 처리에 실패했습니다.' },
      { status: 500 }
    );
  }
}