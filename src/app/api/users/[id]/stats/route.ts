import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb-client';
import { ContentType } from '@/types/activity.types';

// GET /api/users/[id]/stats - 사용자 통계 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    // 사용자 통계 조회 (현재는 기본값 반환)
    // TODO: 실제 통계 계산 로직 구현
    const stats = {
      totalPosts: 0,
      totalComments: 0,
      totalReactions: 0,
      totalViews: 0,
      reactions: {
        likes: 0,
        helpfuls: 0,
        empathies: 0
      },
      contentStats: {
        [ContentType.POLICY_NEWS]: {
          posts: 0,
          comments: 0,
          reactions: 0,
          views: 0
        },
        [ContentType.BUSINESS_VOICE]: {
          posts: 0,
          comments: 0,
          reactions: 0,
          views: 0
        },
        [ContentType.TTONTOK]: {
          posts: 0,
          comments: 0,
          reactions: 0,
          views: 0
        }
      },
      activityByPeriod: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        total: 0
      },
      activityScore: 0,
      level: 1,
      nextLevelProgress: 0
    };

    // 실제로는 posts, comments, reactions 컬렉션에서 집계해야 함
    // 예시:
    // const posts = await db.collection('posts').countDocuments({ userId });
    // const comments = await db.collection('comments').countDocuments({ userId });
    // stats.totalPosts = posts;
    // stats.totalComments = comments;

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch user stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user stats' },
      { status: 500 }
    );
  }
}