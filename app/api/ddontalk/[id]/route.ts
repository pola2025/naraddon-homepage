import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DDonTalk from '@/models/DDonTalk';

// GET: 특정 똔톡 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const post = await DDonTalk.findById(params.id);

    if (!post) {
      return NextResponse.json(
        { success: false, error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 조회수 증가
    await DDonTalk.findByIdAndUpdate(params.id, { $inc: { viewCount: 1 } });

    return NextResponse.json({
      success: true,
      post
    });
  } catch (error) {
    console.error('DDonTalk 상세 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: '게시글을 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 똔톡 수정 (admin 전용)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const body = await request.json();

    const post = await DDonTalk.findByIdAndUpdate(
      params.id,
      { ...body, updatedAt: new Date() },
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
    console.error('DDonTalk 수정 오류:', error);
    return NextResponse.json(
      { success: false, error: '게시글 수정에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 똔톡 삭제 (admin 전용)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const post = await DDonTalk.findByIdAndDelete(params.id);

    if (!post) {
      return NextResponse.json(
        { success: false, error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '게시글이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('DDonTalk 삭제 오류:', error);
    return NextResponse.json(
      { success: false, error: '게시글 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}