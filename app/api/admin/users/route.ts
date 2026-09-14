import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth-options';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import {
  buildDescendingDateCursorFilter,
  parseListRequest,
  takePage,
} from '@/lib/bounded-read';

export const dynamic = 'force-dynamic';

type AdminUserDocument = {
  readonly _id: { toString(): string };
  readonly email?: string;
  readonly name?: string;
  readonly mobile?: string;
  readonly role?: string;
  readonly status?: string;
  readonly isAdmin?: boolean;
  readonly profile?: Record<string, unknown>;
  readonly examinerProfile?: unknown;
  readonly auditorProfile?: unknown;
  readonly expertProfile?: unknown;
  readonly examinerId?: unknown;
  readonly createdAt: Date | string;
  readonly updatedAt?: Date | string;
  readonly lastLoginAt?: Date | string;
};

// GET /api/admin/users - 사용자 목록 조회
export async function GET(request: NextRequest) {
  try {
    /**
     * 사용자 목록 조회 권한 검증
     *
     * @purpose admin, super_admin만 사용자 목록 조회 가능
     * @security CRITICAL - 개인정보 보호
     */
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      console.log('[Admin Users API] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 관리자 권한 확인
    let userRole = (session.user as any)?.role;
    let userIsAdmin = (session.user as any)?.isAdmin;
    // 🔥 HOTFIX: role이 undefined인 경우 DB에서 직접 조회
    if (!userRole || userIsAdmin === undefined) {
      console.warn('[Admin Users API] Role/isAdmin is undefined, fetching from DB');
      try {
        const client = await clientPromise;
        const db = client.db('naraddon');
        const dbUser = await db
          .collection('users')
          .findOne({ email: session.user.email }, { projection: { role: 1, isAdmin: 1 } });

        if (dbUser) {
          userRole = dbUser.role || userRole;
          userIsAdmin = dbUser.isAdmin || false;
        } else {
          console.error('[Admin Users API] Session user not found');
        }
      } catch (dbError) {
        console.error('[Admin Users API] ❌ DB query failed:', dbError);
      }
    }

    // admin, super_admin 역할이거나 isAdmin이 true인 경우 허용
    const hasAdminAccess =
      userRole === 'admin' || userRole === 'super_admin' || userIsAdmin === true;
    if (!hasAdminAccess) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: '관리자 권한이 필요합니다.',
          userRole,
        },
        { status: 403 }
      );
    }

    // 쿼리 파라미터 처리
    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get('role'); // e.g., "expert,examiner"
    const searchQuery = searchParams.get('search');
    const listRequestResult = parseListRequest(searchParams, { defaultLimit: 25, maxLimit: 50 });
    if (listRequestResult.kind === 'invalid') {
      return NextResponse.json({ error: listRequestResult.message }, { status: 400 });
    }
    const { limit, cursor } = listRequestResult.request;

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    // 필터 구성
    const filter: any = {};

    // 역할 필터
    if (roleParam) {
      const roles = roleParam.split(',').map((r) => r.trim());
      filter.role = { $in: roles };
    }

    // 검색 필터 (ReDoS 방지를 위해 regex 이스케이프 적용)
    if (searchQuery) {
      const safeSearch = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { email: { $regex: safeSearch, $options: 'i' } },
        { name: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    let queryFilter = filter;
    if (cursor) {
      const cursorFilterResult = buildDescendingDateCursorFilter(
        cursor,
        'createdAt',
        (id) => new ObjectId(id)
      );
      if (cursorFilterResult.kind === 'invalid') {
        return NextResponse.json({ error: 'cursor is invalid' }, { status: 400 });
      }
      queryFilter = { $and: [filter, cursorFilterResult.filter] };
    }

    const users = await db
      .collection('users')
      .find(queryFilter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .project({
        password: 0, // 비밀번호 제외
        authToken: 0, // 인증 토큰 제외
      })
      .toArray();

    const page = takePage<AdminUserDocument>(users, limit, (user) => ({
      sortValue: new Date(user.createdAt).toISOString(),
      id: user._id.toString(),
    }));
    const userEmails = page.items
      .map((user) => user.email)
      .filter((email): email is string => typeof email === 'string' && email.length > 0);
    const assignedCounts = userEmails.length
      ? await db
          .collection('consultations')
          .aggregate([
            { $match: { assignedStaffId: { $in: userEmails } } },
            { $group: { _id: '$assignedStaffId', count: { $sum: 1 } } },
          ])
          .toArray()
      : [];
    const assignedCountByEmail = new Map(
      assignedCounts.map((entry) => [String(entry._id), Number(entry.count)])
    );

    const usersWithStats = page.items.map((user) => {
      return {
          _id: user._id.toString(),
          email: user.email,
          name: user.name,
          mobile: user.mobile, // 네이버 OAuth에서 받은 전화번호
          role: user.role || 'user',
          status: user.status || 'active',
          isAdmin: user.isAdmin || false, // 관리자 권한 플래그
          profile: user.profile || {},
          examinerProfile: user.examinerProfile || user.auditorProfile, // 하위 호환성 지원
          expertProfile: user.expertProfile,
          examinerId: user.examinerId,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLoginAt: user.lastLoginAt,
          assignedConsultations: assignedCountByEmail.get(user.email) || 0,
      };
    });

    return NextResponse.json(
      {
        users: usersWithStats,
        total: null,
        limit,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
