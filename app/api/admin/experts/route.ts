import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/auth-options';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { buildAscendingCursorFilter, parseListRequest, takePage } from '@/lib/bounded-read';

type ExpertDocument = {
  readonly _id: { toString(): string };
  readonly name?: string;
  readonly [key: string]: unknown;
};

/**
 * GET: 전문가 목록 조회 (관리자 전용)
 * @purpose 관리자가 모든 전문가 정보를 조회
 * @security admin 역할만 접근 가능
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Login required' },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db('naraddon');

    /**
     * DB에서 실제 사용자 역할 확인
     *
     * @purpose 권한 완화 (2026-04-28) — admin/super_admin 모두 전문가 목록 조회 가능
     * @context 통합 페이지(/admin/experts) 에서 사용. 마스터만 보던 화면을 일반 관리자도 사용
     */
    const currentUser = await db.collection('users').findOne({ email: session.user.email });
    const role = currentUser?.role;

    if (!currentUser || (role !== 'admin' && role !== 'super_admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const listRequestResult = parseListRequest(searchParams, { defaultLimit: 25, maxLimit: 50 });
    if (listRequestResult.kind === 'invalid') {
      return NextResponse.json({ error: listRequestResult.message }, { status: 400 });
    }
    const { limit, cursor } = listRequestResult.request;
    const query = cursor
      ? buildAscendingCursorFilter(cursor, 'name', (id) => new ObjectId(id))
      : {};
    const experts = await db
      .collection('experts')
      .find(query)
      .sort({ name: 1, _id: 1 })
      .limit(limit + 1)
      .toArray();
    const page = takePage<ExpertDocument>(experts, limit, (expert) => ({
      sortValue: String(expert.name || ''),
      id: expert._id.toString(),
    }));

    return NextResponse.json(
      {
        success: true,
        experts: page.items.map((expert) => ({
          ...expert,
          _id: expert._id.toString(),
        })),
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('Failed to fetch experts:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch experts' }, { status: 500 });
  }
}
