import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ExaminerProfile from '@/models/ExaminerProfile';

// API Route를 동적으로 설정
export const dynamic = 'force-dynamic';

// 환경변수에서 비밀번호 가져오기
const ADMIN_PASSWORD = process.env.NARADDON_TUBE_PASSWORD;

// CREATE - 새 심사관 생성
export async function POST(request: NextRequest) {
  try {
    console.log('[naraddon-tube/examiners] POST request received');

    const body = await request.json();
    const { password, ...examinerData } = body;

    // 비밀번호 확인
    if (!password || password !== ADMIN_PASSWORD) {
      console.log('[naraddon-tube/examiners] Invalid password');
      return NextResponse.json({
        message: '비밀번호가 올바르지 않습니다.'
      }, { status: 401 });
    }

    // 필수 필드 검증
    if (!examinerData.name || !examinerData.position) {
      return NextResponse.json({
        message: '이름과 직책은 필수 항목입니다.'
      }, { status: 400 });
    }

    await connectDB();

    // 새 심사관 프로필 생성
    const examiner = new ExaminerProfile({
      name: examinerData.name,
      companyName: examinerData.companyName || '',
      position: examinerData.position,
      category: examinerData.category || 'general',
      brandIcon: examinerData.brandIcon || 'fas fa-building',
      rating: examinerData.rating || null,
      successRate: examinerData.successRate || null,
      consultCount: examinerData.consultCount || 0,
      imageKey: examinerData.imageKey || null,
      imageUrl: examinerData.imageUrl || (examinerData.imageKey ? `/images/examiners/${examinerData.imageKey}.png` : null),
      imageAlt: examinerData.imageAlt || `${examinerData.name} ${examinerData.position}`,
      expertiseTags: examinerData.expertiseTags || [],
      expertiseDescription: examinerData.expertiseDescription || '',
      expertiseDetail: examinerData.expertiseDetail || [],
      sortOrder: examinerData.sortOrder || 999,
      legacyKey: examinerData.legacyKey || examinerData.imageKey || `examiner-${Date.now()}`,
      isPublished: examinerData.isPublished !== undefined ? examinerData.isPublished : true,
    });

    await examiner.save();

    console.log('[naraddon-tube/examiners] Examiner created:', examiner.name);

    return NextResponse.json({
      success: true,
      message: '심사관이 성공적으로 등록되었습니다.',
      examiner
    }, { status: 201 });
  } catch (error) {
    console.error('[naraddon-tube/examiners] POST Error:', error);

    // 중복 키 에러 처리
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json({
        message: '이미 존재하는 심사관입니다.'
      }, { status: 409 });
    }

    return NextResponse.json({
      message: '심사관 등록에 실패했습니다.'
    }, { status: 500 });
  }
}

// READ - 심사관 목록 조회
export async function GET(request: NextRequest) {
  try {
    console.log('[naraddon-tube/examiners] GET request received');

    const { searchParams } = new URL(request.url);
    const includeHidden = searchParams.get('includeHidden') === 'true';
    const category = searchParams.get('category');

    await connectDB();

    // 쿼리 조건 설정
    let query: any = {};
    if (!includeHidden) {
      query.isPublished = true;
    }
    if (category) {
      query.category = category;
    }

    const examiners = await ExaminerProfile
      .find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    console.log(`[naraddon-tube/examiners] Found ${examiners.length} examiners`);

    return NextResponse.json({
      success: true,
      examiners,
      total: examiners.length
    });
  } catch (error) {
    console.error('[naraddon-tube/examiners] GET Error:', error);
    return NextResponse.json({
      message: '심사관 목록 조회에 실패했습니다.'
    }, { status: 500 });
  }
}

// UPDATE - 심사관 정보 수정
export async function PUT(request: NextRequest) {
  try {
    console.log('[naraddon-tube/examiners] PUT request received');

    const body = await request.json();
    const { password, id, ...updateData } = body;

    // 비밀번호 확인
    if (!password || password !== ADMIN_PASSWORD) {
      console.log('[naraddon-tube/examiners] Invalid password');
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

    console.log('[naraddon-tube/examiners] Examiner updated:', examiner.name);

    return NextResponse.json({
      success: true,
      message: '심사관 정보가 수정되었습니다.',
      examiner
    });
  } catch (error) {
    console.error('[naraddon-tube/examiners] PUT Error:', error);
    return NextResponse.json({
      message: '심사관 정보 수정에 실패했습니다.'
    }, { status: 500 });
  }
}

// DELETE - 심사관 삭제
export async function DELETE(request: NextRequest) {
  try {
    console.log('[naraddon-tube/examiners] DELETE request received');

    const body = await request.json();
    const { password, id } = body;

    // 비밀번호 확인
    if (!password || password !== ADMIN_PASSWORD) {
      console.log('[naraddon-tube/examiners] Invalid password');
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

    console.log('[naraddon-tube/examiners] Examiner deleted:', examiner.name);

    return NextResponse.json({
      success: true,
      message: '심사관이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('[naraddon-tube/examiners] DELETE Error:', error);
    return NextResponse.json({
      message: '심사관 삭제에 실패했습니다.'
    }, { status: 500 });
  }
}