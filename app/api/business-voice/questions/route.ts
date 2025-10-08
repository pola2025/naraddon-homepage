import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { getBusinessVoiceQuestions } from '@/lib/businessVoiceService';
import BusinessVoiceQuestion from '@/models/BusinessVoiceQuestion';
import connectDB from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const limitParam = searchParams.get('limit');
    const needsExpertParam = searchParams.get('needsExpertReply');

    const limit = limitParam ? Number(limitParam) : undefined;
    const needsExpertReply =
      typeof needsExpertParam === 'string' ? needsExpertParam === 'true' : undefined;

    const questions = await getBusinessVoiceQuestions({
      category,
      limit,
      needsExpertReply,
    });

    return NextResponse.json({ questions, count: questions.length });
  } catch (error) {
    console.error('[business-voice] GET /api/business-voice/questions error', error);
    return NextResponse.json(
      { message: 'Failed to load Business Voice questions.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 로그인 체크
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, category } = body;

    // 입력 검증
    if (!title || !content || !category) {
      return NextResponse.json(
        { message: '제목, 내용, 카테고리는 필수입니다.' },
        { status: 400 }
      );
    }

    if (title.length < 5 || title.length > 200) {
      return NextResponse.json(
        { message: '제목은 5~200자 이내로 작성해주세요.' },
        { status: 400 }
      );
    }

    if (content.length < 10 || content.length > 5000) {
      return NextResponse.json(
        { message: '내용은 10~5000자 이내로 작성해주세요.' },
        { status: 400 }
      );
    }

    await connectDB();

    // 질문 생성
    const newQuestion = await BusinessVoiceQuestion.create({
      title,
      content,
      category: category.toLowerCase(),
      author: {
        nickname: session.user.name || '익명',
        businessType: body.businessType || '기타',
        region: body.region || '미지정',
        yearsInBusiness: body.yearsInBusiness || null,
      },
      metrics: {
        viewCount: 0,
        commentCount: 0,
        scrapCount: 0,
      },
      flags: {
        needsExpertReply: body.needsExpertReply || false,
        needsExaminerReply: body.needsExaminerReply || false,
      },
      sources: [],
      answers: [],
    });

    return NextResponse.json(
      {
        message: '질문이 등록되었습니다.',
        question: {
          id: newQuestion._id.toString(),
          title: newQuestion.title,
          createdAt: newQuestion.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[business-voice] POST /api/business-voice/questions error', error);
    return NextResponse.json({ message: '질문 등록에 실패했습니다.' }, { status: 500 });
  }
}
