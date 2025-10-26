import { NextRequest, NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

import BusinessVoiceQuestion from '@/models/BusinessVoiceQuestion';
import connectDB from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

/**
 * GET /api/business-voice/questions/[id] - 질문 상세 조회
 */
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

/**
 * PATCH /api/business-voice/questions/[id] - 질문 수정 (관리자)
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // ID 형식 검증
    if (!isValidObjectId(id)) {
      return NextResponse.json({ message: '잘못된 ID 형식입니다.' }, { status: 400 });
    }

    // 관리자 권한 확인 (x-admin-auth 헤더로 간단 인증)
    const adminAuth = request.headers.get('x-admin-auth');
    if (adminAuth !== 'true') {
      // 또는 세션 기반 권한 확인
      const session = await getServerSession(authOptions);
      const userRole = (session?.user as any)?.role;

      if (userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'examiner') {
        return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 });
      }
    }

    const body = await request.json();

    await connectDB();

    const question = await BusinessVoiceQuestion.findById(id);

    if (!question) {
      return NextResponse.json({ message: '질문을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 업데이트 가능한 필드만 수정
    if (body.title !== undefined) question.title = body.title;
    if (body.content !== undefined) question.content = body.content;
    if (body.category !== undefined) question.category = body.category;

    if (body.author !== undefined) {
      question.author = {
        ...question.author,
        ...body.author
      };
    }

    if (body.metrics !== undefined) {
      question.metrics = {
        ...question.metrics,
        ...body.metrics
      };
    }

    if (body.flags !== undefined) {
      question.flags = {
        ...question.flags,
        ...body.flags
      };
    }

    await question.save();

    return NextResponse.json({
      message: '질문이 수정되었습니다.',
      question: {
        id: question._id.toString(),
        title: question.title,
        updatedAt: question.updatedAt
      }
    });
  } catch (error) {
    console.error('[business-voice] PATCH /api/business-voice/questions/[id] error', error);
    return NextResponse.json({ message: '질문 수정에 실패했습니다.' }, { status: 500 });
  }
}

/**
 * DELETE /api/business-voice/questions/[id] - 질문 삭제 (관리자)
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // ID 형식 검증
    if (!isValidObjectId(id)) {
      return NextResponse.json({ message: '잘못된 ID 형식입니다.' }, { status: 400 });
    }

    // 관리자 권한 확인
    const adminAuth = request.headers.get('x-admin-auth');
    if (adminAuth !== 'true') {
      const session = await getServerSession(authOptions);
      const userRole = (session?.user as any)?.role;

      if (userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'examiner') {
        return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 });
      }
    }

    await connectDB();

    const question = await BusinessVoiceQuestion.findByIdAndDelete(id);

    if (!question) {
      return NextResponse.json({ message: '질문을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({
      message: '질문이 삭제되었습니다.',
      deletedId: id
    });
  } catch (error) {
    console.error('[business-voice] DELETE /api/business-voice/questions/[id] error', error);
    return NextResponse.json({ message: '질문 삭제에 실패했습니다.' }, { status: 500 });
  }
}
