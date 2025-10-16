import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import clientPromise from '@/lib/mongodb-client';

// POST /api/admin/grant-role - 관리자 비밀번호 확인 후 세션에 admin 권한 부여
export async function POST(request: NextRequest) {
  try {
    // 세션 확인 (네이버 로그인 필수)
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: '비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 환경변수에서 관리자 비밀번호 확인
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.error('ADMIN_PASSWORD environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // 비밀번호 검증
    if (password !== adminPassword) {
      return NextResponse.json(
        { error: '비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    // 사용자 정보 업데이트 (role을 admin으로 변경)
    const result = await db.collection('users').updateOne(
      { email: session.user.email },
      {
        $set: {
          role: 'admin',
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      // 사용자가 DB에 없으면 생성
      await db.collection('users').insertOne({
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        role: 'admin',
        provider: (session.user as any)?.provider || 'naver',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date()
      });
    }

    return NextResponse.json({
      success: true,
      message: '관리자 권한이 부여되었습니다. 페이지를 새로고침하세요.',
      role: 'admin'
    });
  } catch (error) {
    console.error('Grant role error:', error);
    return NextResponse.json(
      { error: '권한 부여 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
