import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ExaminerProfile from '@/models/ExaminerProfile';

// API Route를 동적으로 설정
export const dynamic = 'force-dynamic';

// 환경변수에서 비밀번호 가져오기
const ADMIN_PASSWORD = process.env.NARADDON_TUBE_PASSWORD;

// GET - 특정 심사관 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[naraddon-tube/examiners/[id]] GET request received');

    const { id } = params;

    if (!id) {
      return NextResponse.json({
        message: '심사관 ID가 필요합니다.'
      }, { status: 400 });
    }

    await connectDB();

    const examiner = await ExaminerProfile.findById(id).lean();

    if (!examiner) {
      return NextResponse.json({
        message: '심사관을 찾을 수 없습니다.'
      }, { status: 404 });
    }

    console.log('[naraddon-tube/examiners/[id]] Examiner found:', examiner.name);

    return NextResponse.json({
      success: true,
      examiner
    });
  } catch (error) {
    console.error('[naraddon-tube/examiners/[id]] GET Error:', error);
    return NextResponse.json({
      message: '심사관 조회에 실패했습니다.'
    }, { status: 500 });
  }
}

// PUT - 특정 심사관 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[naraddon-tube/examiners/[id]] PUT request received');

    const { id } = params;
    const body = await request.json();
    const { password, ...updateData } = body;

    // 비밀번호 확인
    if (!password || password !== ADMIN_PASSWORD) {
      console.log('[naraddon-tube/examiners/[id]] Invalid password');
      return NextResponse.json({
        message: '비밀번호가 올바르지 않습니다.'
      }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({
        message: '심사관 ID가 필요합니다.'
      }, { status: 400 });
    }

    await connectDB();

    // imageUrl 자동 설정
    if (updateData.imageKey) {
      updateData.imageUrl = `/images/examiners/${updateData.imageKey}.png`;
    }

    const examiner = await ExaminerProfile.findByIdAndUpdate(
      id,
      {
        $set: updateData,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!examiner) {
      return NextResponse.json({
        message: '심사관을 찾을 수 없습니다.'
      }, { status: 404 });
    }

    console.log('[naraddon-tube/examiners/[id]] Examiner updated:', examiner.name);

    return NextResponse.json({
      success: true,
      message: '심사관 정보가 수정되었습니다.',
      examiner
    });
  } catch (error) {
    console.error('[naraddon-tube/examiners/[id]] PUT Error:', error);
    return NextResponse.json({
      message: '심사관 정보 수정에 실패했습니다.'
    }, { status: 500 });
  }
}

// DELETE - 특정 심사관 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[naraddon-tube/examiners/[id]] DELETE request received');

    const { id } = params;

    // 헤더에서 비밀번호 확인
    const password = request.headers.get('x-admin-password');

    if (!password || password !== ADMIN_PASSWORD) {
      console.log('[naraddon-tube/examiners/[id]] Invalid password');
      return NextResponse.json({
        message: '비밀번호가 올바르지 않습니다.'
      }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({
        message: '심사관 ID가 필요합니다.'
      }, { status: 400 });
    }

    await connectDB();

    const examiner = await ExaminerProfile.findByIdAndDelete(id);

    if (!examiner) {
      return NextResponse.json({
        message: '심사관을 찾을 수 없습니다.'
      }, { status: 404 });
    }

    console.log('[naraddon-tube/examiners/[id]] Examiner deleted:', examiner.name);

    return NextResponse.json({
      success: true,
      message: '심사관이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('[naraddon-tube/examiners/[id]] DELETE Error:', error);
    return NextResponse.json({
      message: '심사관 삭제에 실패했습니다.'
    }, { status: 500 });
  }
}