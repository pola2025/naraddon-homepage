import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import TtontokNickname from '@/models/TtontokNickname';

export const dynamic = 'force-dynamic';

/**
 * GET /api/business-voice/ttontok/nicknames
 * 닉네임 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role'); // general, certified_examiner, expert
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const query: any = {};
    if (role) {
      query.role = role;
    }
    if (activeOnly) {
      query.isActive = true;
    }

    const nicknames = await TtontokNickname.find(query)
      .sort({ role: 1, sortOrder: 1, nickname: 1 })
      .lean();

    // role별로 그룹화
    const grouped = {
      examiners: nicknames
        .filter((n: any) => n.role === 'certified_examiner')
        .map((n: any) => n.nickname),
      experts: nicknames
        .filter((n: any) => n.role === 'expert')
        .map((n: any) => n.nickname),
      general: nicknames
        .filter((n: any) => n.role === 'general')
        .map((n: any) => n.nickname),
    };

    return NextResponse.json({
      success: true,
      data: nicknames,
      grouped,
    });
  } catch (error) {
    console.error('[Nicknames] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '닉네임 목록을 불러오는데 실패했습니다.',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/business-voice/ttontok/nicknames
 * 닉네임 생성 (관리자 전용)
 */
export async function POST(request: NextRequest) {
  try {
    // 관리자 인증 확인
    const adminAuth = request.headers.get('x-admin-auth');
    if (adminAuth !== 'true') {
      return NextResponse.json(
        { success: false, message: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { nickname, role, sortOrder } = body;

    if (!nickname || !role) {
      return NextResponse.json(
        { success: false, message: '닉네임과 역할은 필수입니다.' },
        { status: 400 }
      );
    }

    // 중복 확인
    const existing = await TtontokNickname.findOne({ nickname });
    if (existing) {
      return NextResponse.json(
        { success: false, message: '이미 존재하는 닉네임입니다.' },
        { status: 409 }
      );
    }

    const newNickname = await TtontokNickname.create({
      nickname,
      role,
      sortOrder: sortOrder || 0,
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      data: newNickname,
      message: '닉네임이 추가되었습니다.',
    });
  } catch (error) {
    console.error('[Nicknames] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '닉네임 추가에 실패했습니다.',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/business-voice/ttontok/nicknames
 * 닉네임 수정 (관리자 전용)
 */
export async function PATCH(request: NextRequest) {
  try {
    // 관리자 인증 확인
    const adminAuth = request.headers.get('x-admin-auth');
    if (adminAuth !== 'true') {
      return NextResponse.json(
        { success: false, message: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { id, nickname, role, sortOrder, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID는 필수입니다.' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (nickname !== undefined) updateData.nickname = nickname;
    if (role !== undefined) updateData.role = role;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await TtontokNickname.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, message: '닉네임을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: '닉네임이 수정되었습니다.',
    });
  } catch (error) {
    console.error('[Nicknames] PATCH error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '닉네임 수정에 실패했습니다.',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/business-voice/ttontok/nicknames
 * 닉네임 삭제 (관리자 전용)
 */
export async function DELETE(request: NextRequest) {
  try {
    // 관리자 인증 확인
    const adminAuth = request.headers.get('x-admin-auth');
    if (adminAuth !== 'true') {
      return NextResponse.json(
        { success: false, message: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID는 필수입니다.' },
        { status: 400 }
      );
    }

    const deleted = await TtontokNickname.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: '닉네임을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '닉네임이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('[Nicknames] DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '닉네임 삭제에 실패했습니다.',
      },
      { status: 500 }
    );
  }
}
