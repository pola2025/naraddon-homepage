import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import BusinessVoiceQuestion from '@/models/BusinessVoiceQuestion';
import connectDB from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 로그인 체크
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { content } = body;

    // 입력 검증
    if (!content) {
      return NextResponse.json({ message: '답변 내용은 필수입니다.' }, { status: 400 });
    }

    if (content.length < 10 || content.length > 3000) {
      return NextResponse.json(
        { message: '답변은 10~3000자 이내로 작성해주세요.' },
        { status: 400 }
      );
    }

    await connectDB();

    // 질문 존재 확인
    const question = await BusinessVoiceQuestion.findById(id);
    if (!question) {
      return NextResponse.json({ message: '질문을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 답변 추가
    const newAnswer = {
      role: 'community' as const,
      displayName: session.user.name || '익명',
      content,
      isPinned: false,
      sources: [],
      helpfulCount: 0,
      answeredAt: new Date(),
    };

    question.answers.push(newAnswer);
    await question.save();

    return NextResponse.json(
      {
        message: '답변이 등록되었습니다.',
        answer: newAnswer,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[business-voice] POST /api/business-voice/questions/[id]/answers error', error);
    return NextResponse.json({ message: '답변 등록에 실패했습니다.' }, { status: 500 });
  }
}
