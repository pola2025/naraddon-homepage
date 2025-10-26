import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import BusinessVoiceQuestion from '@/models/BusinessVoiceQuestion';
import connectDB from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/business-voice/answers/[answerId] - 답변 수정 (관리자)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { answerId: string } }
) {
  try {
    const { answerId } = params;

    // 관리자 권한 확인
    const adminAuth = request.headers.get('x-admin-auth');
    if (adminAuth !== 'true') {
      const session = await getServerSession(authOptions);
      const userRole = (session?.user as any)?.role;

      if (userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'examiner') {
        return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 });
      }
    }

    const body = await request.json();

    await connectDB();

    // 답변이 포함된 질문 찾기
    const question = await BusinessVoiceQuestion.findOne({
      'answers._id': answerId
    });

    if (!question) {
      return NextResponse.json({ message: '답변을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 답변 찾기 및 수정
    const answer = question.answers.id(answerId);
    if (!answer) {
      return NextResponse.json({ message: '답변을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 업데이트 가능한 필드만 수정
    if (body.content !== undefined) answer.content = body.content;
    if (body.displayName !== undefined) answer.displayName = body.displayName;
    if (body.role !== undefined) answer.role = body.role;
    if (body.isPinned !== undefined) answer.isPinned = body.isPinned;
    if (body.helpfulCount !== undefined) answer.helpfulCount = body.helpfulCount;
    if (body.headline !== undefined) answer.headline = body.headline;
    if (body.title !== undefined) answer.title = body.title;
    if (body.organization !== undefined) answer.organization = body.organization;

    await question.save();

    return NextResponse.json({
      message: '답변이 수정되었습니다.',
      answer: {
        id: answer._id.toString(),
        content: answer.content,
        displayName: answer.displayName
      }
    });
  } catch (error) {
    console.error('[business-voice] PATCH /api/business-voice/answers/[answerId] error', error);
    return NextResponse.json({ message: '답변 수정에 실패했습니다.' }, { status: 500 });
  }
}

/**
 * DELETE /api/business-voice/answers/[answerId] - 답변 삭제 (관리자)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { answerId: string } }
) {
  try {
    const { answerId } = params;

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

    // 답변이 포함된 질문 찾기
    const question = await BusinessVoiceQuestion.findOne({
      'answers._id': answerId
    });

    if (!question) {
      return NextResponse.json({ message: '답변을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 답변 제거
    const answer = question.answers.id(answerId);
    if (!answer) {
      return NextResponse.json({ message: '답변을 찾을 수 없습니다.' }, { status: 404 });
    }

    answer.deleteOne();
    await question.save();

    return NextResponse.json({
      message: '답변이 삭제되었습니다.',
      deletedId: answerId
    });
  } catch (error) {
    console.error('[business-voice] DELETE /api/business-voice/answers/[answerId] error', error);
    return NextResponse.json({ message: '답변 삭제에 실패했습니다.' }, { status: 500 });
  }
}
