import { NextRequest, NextResponse } from 'next/server';
import { deleteAdminSession } from '@/lib/auth/admin-auth';

export async function POST(request: NextRequest) {
  try {
    await deleteAdminSession();

    return NextResponse.json(
      {
        success: true,
        message: '로그아웃되었습니다.'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: '로그아웃 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}