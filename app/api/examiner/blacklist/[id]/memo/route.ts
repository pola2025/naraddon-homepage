/**
 * 기업심사관 블랙리스트 메모 API
 *
 * POST /api/examiner/blacklist/[id]/memo - 메모 추가
 *
 * @access 기업심사관만 접근 가능
 * @note 모든 기업심사관이 메모 추가 가능
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import ExaminerBlacklist from '@/models/ExaminerBlacklist';

/**
 * POST - 메모 추가
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. 세션 확인
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'examiner') {
      return NextResponse.json(
        { error: '기업심사관만 접근 가능합니다.' },
        { status: 403 }
      );
    }

    // 2. 요청 데이터 파싱
    const body = await request.json();
    const { content } = body;

    // 3. 필수 항목 검증
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: '메모 내용을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        { error: '메모는 최대 500자까지 입력 가능합니다.' },
        { status: 400 }
      );
    }

    // 4. DB 연결
    await connectDB();

    // 5. 기존 항목 조회
    const existingEntry = await ExaminerBlacklist.findById(params.id);

    if (!existingEntry) {
      return NextResponse.json(
        { error: '해당 블랙리스트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 6. 메모 추가
    const newMemo = {
      content: content.trim(),
      createdBy: session.user.id,
      createdByName: session.user.name || '알 수 없음',
      createdAt: new Date(),
    };

    existingEntry.memos.push(newMemo as any);
    await existingEntry.save();

    return NextResponse.json({
      success: true,
      message: '메모가 추가되었습니다.',
      memo: newMemo,
    });
  } catch (error) {
    console.error('[Blacklist Memo POST Error]', error);
    return NextResponse.json(
      { error: '메모 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
