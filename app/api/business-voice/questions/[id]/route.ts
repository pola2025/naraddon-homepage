import { NextRequest, NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';

import BusinessVoiceQuestion from '@/models/BusinessVoiceQuestion';
import connectDB from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // ID 형식 검증
    if (!isValidObjectId(id)) {
      return NextResponse.json({ message: '잘못된 ID 형식입니다.' }, { status: 400 });
    }

    await connectDB();

    const question = await BusinessVoiceQuestion.findById(id);

    if (!question) {
      return NextResponse.json({ message: '질문을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 조회수 증가
    question.metrics.viewCount += 1;
    await question.save();

    // 응답 데이터 변환
    const questionData = {
      id: question._id.toString(),
      title: question.title,
      content: question.content,
      category: question.category,
      author: question.author,
      metrics: question.metrics,
      flags: question.flags,
      sources: question.sources,
      answers: question.answers.map((answer: any) => ({
        role: answer.role,
        displayName: answer.displayName,
        headline: answer.headline,
        title: answer.title,
        organization: answer.organization,
        content: answer.content,
        isPinned: answer.isPinned,
        sources: answer.sources || [],
        helpfulCount: answer.helpfulCount || 0,
        profileId: answer.profileId?.toString(),
        answeredAt: answer.answeredAt,
      })),
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    };

    return NextResponse.json({ question: questionData });
  } catch (error) {
    console.error('[business-voice] GET /api/business-voice/questions/[id] error', error);
    return NextResponse.json({ message: '질문을 불러오는데 실패했습니다.' }, { status: 500 });
  }
}
