import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DDonTalk from '@/models/DDonTalk';

// POST: 좋아요 증가
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const post = await DDonTalk.findByIdAndUpdate(
      params.id,
      { $inc: { likes: 1 } },
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
      data: post
    });
  } catch (error) {
    console.error('좋아요 오류:', error);
    return NextResponse.json(
      { success: false, error: '좋아요 처리에 실패했습니다.' },
      { status: 500 }
    );
  }
}