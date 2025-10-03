import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DDonTalk from '@/models/DDonTalk';

// GET: 똔톡 목록 조회
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const posts = await DDonTalk.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await DDonTalk.countDocuments();

    // 베스트 게시글 선택 (좋아요 수 기준 상위 2개)
    const bestPosts = await DDonTalk.find()
      .sort({ likes: -1 })
      .limit(2)
      .lean();

    return NextResponse.json({
      success: true,
      posts: posts,
      bestPosts: bestPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('DDonTalk 목록 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: '목록을 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
}

// POST: 새 똔톡 작성
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { title, content, author, company } = body;

    // 유효성 검사
    if (!title || !content || !author || !company) {
      return NextResponse.json(
        { success: false, error: '필수 항목을 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    // 실제 회원 작성 시 글자 수 제한 없음

    const newPost = await DDonTalk.create({
      title,
      content,
      author,
      company,
      likes: 0,
      comments: []
    });

    return NextResponse.json({
      success: true,
      data: newPost
    }, { status: 201 });
  } catch (error) {
    console.error('DDonTalk 작성 오류:', error);
    return NextResponse.json(
      { success: false, error: '게시글 작성에 실패했습니다.' },
      { status: 500 }
    );
  }
}