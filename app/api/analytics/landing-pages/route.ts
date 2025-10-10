import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';

/**
 * 랜딩 페이지 성능 분석 API
 *
 * @purpose 첫 방문 페이지별 성과 측정 (이탈률, 전환율, 체류시간)
 * @context 어떤 랜딩 페이지가 전환에 효과적인지 측정
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // 날짜 범위 설정
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    // 세션의 첫 방문 페이지 찾기 (pageViewCount = 1)
    const query: any = { pageViewCount: 1 };
    if (Object.keys(dateFilter).length > 0) {
      query.timestamp = dateFilter;
    }

    // 랜딩 페이지별 집계
    const landingPageStats = await db.collection('page-visits').aggregate([
      { $match: query },
      {
        $group: {
          _id: '$pathname',
          sessions: { $addToSet: '$sessionId' },
          totalTimeSpent: { $sum: '$timeSpent' },
          totalVisits: { $sum: 1 },
        }
      },
      {
        $project: {
          pathname: '$_id',
          sessionCount: { $size: '$sessions' },
          totalTimeSpent: 1,
          totalVisits: 1,
          avgTimeSpent: {
            $cond: {
              if: { $gt: [{ $size: '$sessions' }, 0] },
              then: { $divide: ['$totalTimeSpent', { $size: '$sessions' }] },
              else: 0
            }
          },
        }
      },
      { $sort: { sessionCount: -1 } },
      { $limit: limit }
    ]).toArray();

    // 각 랜딩 페이지별 전환 및 이탈률 계산
    const pagesWithMetrics = await Promise.all(
      landingPageStats.map(async (page) => {
        // 해당 랜딩 페이지로 시작한 세션 ID들
        const sessions = await db.collection('page-visits')
          .find({ pathname: page.pathname, pageViewCount: 1 })
          .project({ sessionId: 1 })
          .toArray();

        const sessionIds = [...new Set(sessions.map(s => s.sessionId))];

        // 전환 수 계산
        const conversions = await db.collection('conversions').countDocuments({
          sessionId: { $in: sessionIds }
        });

        const conversionRate = page.sessionCount > 0
          ? (conversions / page.sessionCount) * 100
          : 0;

        // 이탈률 계산 (1페이지만 보고 나간 세션)
        const bounces = await db.collection('page-visits').aggregate([
          { $match: { sessionId: { $in: sessionIds } } },
          {
            $group: {
              _id: '$sessionId',
              maxPageView: { $max: '$pageViewCount' }
            }
          },
          { $match: { maxPageView: 1 } },
          { $count: 'total' }
        ]).toArray();

        const bounceCount = bounces.length > 0 ? bounces[0].total : 0;
        const bounceRate = page.sessionCount > 0
          ? (bounceCount / page.sessionCount) * 100
          : 0;

        // 다음 페이지 경로 분석 (Top 5)
        const nextPages = await db.collection('page-visits').aggregate([
          {
            $match: {
              sessionId: { $in: sessionIds },
              pageViewCount: 2 // 두 번째 페이지
            }
          },
          {
            $group: {
              _id: '$pathname',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ]).toArray();

        return {
          pathname: page.pathname,
          sessions: page.sessionCount,
          conversions,
          conversionRate: Math.round(conversionRate * 100) / 100,
          bounceRate: Math.round(bounceRate * 100) / 100,
          avgTimeSpent: Math.round(page.avgTimeSpent),
          nextPages: nextPages.map(np => ({
            pathname: np._id,
            count: np.count,
            percentage: Math.round((np.count / page.sessionCount) * 10000) / 100
          })),
        };
      })
    );

    // 전체 요약
    const summary = pagesWithMetrics.reduce((acc, page) => ({
      totalSessions: acc.totalSessions + page.sessions,
      totalConversions: acc.totalConversions + page.conversions,
      avgBounceRate: acc.avgBounceRate + page.bounceRate,
      avgConversionRate: acc.avgConversionRate + page.conversionRate,
    }), {
      totalSessions: 0,
      totalConversions: 0,
      avgBounceRate: 0,
      avgConversionRate: 0,
    });

    const pageCount = pagesWithMetrics.length;
    if (pageCount > 0) {
      summary.avgBounceRate = Math.round((summary.avgBounceRate / pageCount) * 100) / 100;
      summary.avgConversionRate = Math.round((summary.avgConversionRate / pageCount) * 100) / 100;
    }

    return NextResponse.json({
      success: true,
      landingPages: pagesWithMetrics,
      summary,
    });
  } catch (error) {
    console.error('[Analytics/LandingPages] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch landing page data' },
      { status: 500 }
    );
  }
}
