import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '@/lib/mongodb-client';

export const dynamic = 'force-dynamic';

// GET /api/admin/users - 사용자 목록 조회
export async function GET(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 관리자 권한 확인
    const userRole = (session.user as any)?.role;
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 쿼리 파라미터 처리
    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get('role'); // e.g., "expert,examiner"
    const searchQuery = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    // 필터 구성
    const filter: any = {};

    // 역할 필터
    if (roleParam) {
      const roles = roleParam.split(',').map(r => r.trim());
      filter.role = { $in: roles };
    }

    // 검색 필터
    if (searchQuery) {
      filter.$or = [
        { email: { $regex: searchQuery, $options: 'i' } },
        { name: { $regex: searchQuery, $options: 'i' } }
      ];
    }

    // 사용자 목록 조회
    console.log('[Admin Users API] Fetching users with filter:', filter);
    const users = await db.collection('users')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .project({
        password: 0, // 비밀번호 제외
        authToken: 0 // 인증 토큰 제외
      })
      .toArray();

    console.log('[Admin Users API] Found users count:', users.length);
    console.log('[Admin Users API] First user:', users[0]);

    // 전체 개수
    const total = await db.collection('users').countDocuments(filter);
    console.log('[Admin Users API] Total users in DB:', total);

    // 각 사용자의 상담 배정 개수 추가
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const assignedConsultations = await db.collection('consultations')
          .countDocuments({ assignedStaffId: user.email });

        return {
          _id: user._id.toString(),
          email: user.email,
          name: user.name,
          mobile: user.mobile, // 네이버 OAuth에서 받은 전화번호
          role: user.role || 'user',
          status: user.status || 'active',
          profile: user.profile || {},
          examinerProfile: user.examinerProfile || user.auditorProfile, // 하위 호환성 지원
          expertProfile: user.expertProfile,
          examinerId: user.examinerId,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLoginAt: user.lastLoginAt,
          assignedConsultations
        };
      })
    );

    return NextResponse.json({
      users: usersWithStats,
      total,
      limit,
      skip
    });

  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
