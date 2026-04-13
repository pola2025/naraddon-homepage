import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth-options';
import clientPromise from '@/lib/mongodb-client';
import { isAdmin } from '@/lib/auth/role-check';

/**
 * GET /api/naraddon-tube/get-password
 * 관리자 세션이 있을 때만 NARADDON_TUBE_PASSWORD 반환
 *
 * @fix 서버→서버 self-fetch 제거 → MongoDB 직접 조회로 변경
 *      isAdmin 플래그도 체크하도록 수정
 */
export async function GET(request: NextRequest) {
  try {
    // NextAuth 세션 확인
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // MongoDB에서 직접 사용자 role/isAdmin 조회 (self-fetch 제거)
    const client = await clientPromise;
    const db = client.db('naraddon');
    const user = await db.collection('users').findOne({ email: session.user.email });

    if (!user) {
      console.warn('[get-password] User not found in DB:', session.user.email);
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // role-check.ts의 isAdmin 함수 사용 (role === admin/super_admin || isAdmin === true)
    const userForCheck = { role: user.role, isAdmin: user.isAdmin === true };

    if (!isAdmin(userForCheck)) {
      console.warn(
        '[get-password] Not admin:',
        session.user.email,
        'role:',
        user.role,
        'isAdmin:',
        user.isAdmin
      );
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // 관리자 확인되면 NARADDON_TUBE_PASSWORD 반환
    const password = process.env.NARADDON_TUBE_PASSWORD;

    if (!password) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    return NextResponse.json({ password });
  } catch (error) {
    console.error('[get-password] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
