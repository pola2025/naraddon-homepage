import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';

/**
 * 이탈 페이지 분석 API
 *
 * @purpose 사용자가 어디서 이탈하는지 파악하여 UX 개선
 * @context 세션의 마지막 페이지를 이탈 페이지로 간주
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

    const query: any = {};
    if (Object.keys(dateFilter).length > 0) {
      query.timestamp = dateFilter;
    }

    // 세션별 마지막 페이지 찾기 (가장 높은 pageViewCount)
    const exitPages = await db.collection('page-visits').aggregate([
      { $match: query },
      {
        $sort: { sessionId: 1, pageViewCount: -1 }
      },
      {
        $group: {
          _id: '$sessionId',
          lastPage: { $first: '$pathname' },
          maxPageView: { $first: '$pageViewCount' },
          timeSpent: { $first: '$timeSpent' },
          timestamp: { $first: '$timestamp' },
        }
      },
      {
        $group: {
          _id: '$lastPage',
          exitCount: { $sum: 1 },
          avgTimeSpent: { $avg: '$timeSpent' },
          avgPageViewsBeforeExit: { $avg: '$maxPageView' },
        }
      },
      {
        $project: {
          pathname: '$_id',
          exitCount: 1,
          avgTimeSpent: { $round: ['$avgTimeSpent', 0] },
          avgPageViewsBeforeExit: { $round: ['$avgPageViewsBeforeExit', 1] },
        }
      },
      { $sort: { exitCount: -1 } },
      { $limit: limit }
    ]).toArray();

    // 각 이탈 페이지별 추가 메트릭 계산
    const pagesWithMetrics = await Promise.all(
      exitPages.map(async (page) => {
        // 해당 페이지의 총 방문 수
        const totalVisits = await db.collection('page-visits').countDocuments({
          pathname: page.pathname,
          ...(Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {})
        });

        // 이탈률 = (이탈 수 / 총 방문 수) * 100
        const exitRate = totalVisits > 0
          ? (page.exitCount / totalVisits) * 100
          : 0;

        // 이탈 전 경로 분석 (이 페이지에 오기 전 페이지 Top 5)
        const previousPages = await db.collection('page-visits').aggregate([
          {
            $match: {
              sessionId: {
                $in: await db.collection('page-visits')
                  .aggregate([
                    { $match: query },
                    { $sort: { sessionId: 1, pageViewCount: -1 } },
                    {
                      $group: {
                        _id: '$sessionId',
                        lastPage: { $first: '$pathname' }
                      }
                    },
                    { $match: { lastPage: page.pathname } },
                    { $project: { _id: '$_id' } }
                  ])
                  .toArray()
                  .then(sessions => sessions.map(s => s._id))
              }
            }
          },
          { $sort: { sessionId: 1, pageViewCount: 1 } },
          {
            $group: {
              _id: '$sessionId',
              pages: { $push: { pathname: '$pathname', pageView: '$pageViewCount' } }
            }
          },
          { $unwind: '$pages' },
          {
            $group: {
              _id: '$pages.pathname',
              count: { $sum: 1 }
            }
          },
          { $match: { _id: { $ne: page.pathname } } }, // 자기 자신 제외
          { $sort: { count: -1 } },
          { $limit: 5 }
        ]).toArray();

        return {
          pathname: page.pathname,
          exitCount: page.exitCount,
          totalVisits,
          exitRate: Math.round(exitRate * 100) / 100,
          avgTimeSpent: page.avgTimeSpent,
          avgPageViewsBeforeExit: page.avgPageViewsBeforeExit,
          previousPages: previousPages.map(pp => ({
            pathname: pp._id,
            count: pp.count,
          })),
        };
      })
    );

    // 전체 요약
    const summary = {
      totalExits: pagesWithMetrics.reduce((sum, p) => sum + p.exitCount, 0),
      avgExitRate: pagesWithMetrics.length > 0
        ? Math.round((pagesWithMetrics.reduce((sum, p) => sum + p.exitRate, 0) / pagesWithMetrics.length) * 100) / 100
        : 0,
      avgTimeBeforeExit: pagesWithMetrics.length > 0
        ? Math.round(pagesWithMetrics.reduce((sum, p) => sum + p.avgTimeSpent, 0) / pagesWithMetrics.length)
        : 0,
    };

    // 개선이 필요한 페이지 식별 (이탈률 30% 이상)
    const highExitRatePages = pagesWithMetrics
      .filter(p => p.exitRate >= 30)
      .sort((a, b) => b.exitRate - a.exitRate);

    return NextResponse.json({
      success: true,
      exitPages: pagesWithMetrics,
      summary,
      recommendations: {
        highExitRatePages,
        totalNeedingImprovement: highExitRatePages.length,
      },
    });
  } catch (error) {
    console.error('[Analytics/ExitPages] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exit page data' },
      { status: 500 }
    );
  }
}
