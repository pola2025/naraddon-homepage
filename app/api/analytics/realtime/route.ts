import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';

/**
 * 실시간 대시보드 API
 *
 * @purpose 현재 진행 중인 트래픽 및 사용자 행동 실시간 모니터링
 * @context 최근 10분, 1시간, 오늘 데이터
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('range') || '10m'; // 10m, 1h, today

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    // 시간 범위 설정
    const now = new Date();
    let startTime: Date;

    if (timeRange === '10m') {
      startTime = new Date(now.getTime() - 10 * 60 * 1000); // 10분 전
    } else if (timeRange === '1h') {
      startTime = new Date(now.getTime() - 60 * 60 * 1000); // 1시간 전
    } else {
      // today
      startTime = new Date(now);
      startTime.setHours(0, 0, 0, 0);
    }

    // 병렬로 데이터 수집
    const [
      recentVisits,
      activeSessionsData,
      recentConversions,
      topPagesNow,
      topReferrersNow,
    ] = await Promise.all([
      // 최근 방문 (최근 50개)
      db.collection('page-visits')
        .find({ timestamp: { $gte: startTime } })
        .sort({ timestamp: -1 })
        .limit(50)
        .project({ pathname: 1, timestamp: 1, sessionId: 1, referer: 1 })
        .toArray(),

      // 활성 세션 수 (중복 제거)
      db.collection('page-visits')
        .aggregate([
          { $match: { timestamp: { $gte: startTime } } },
          { $group: { _id: '$sessionId' } },
          { $count: 'total' }
        ])
        .toArray(),

      // 최근 전환 이벤트
      db.collection('conversions')
        .find({ timestamp: { $gte: startTime } })
        .sort({ timestamp: -1 })
        .limit(20)
        .project({ conversionType: 1, timestamp: 1, sessionId: 1 })
        .toArray(),

      // 현재 인기 페이지
      db.collection('page-visits')
        .aggregate([
          { $match: { timestamp: { $gte: startTime } } },
          {
            $group: {
              _id: '$pathname',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ])
        .toArray(),

      // 현재 유입 경로
      db.collection('page-visits')
        .aggregate([
          {
            $match: {
              timestamp: { $gte: startTime },
              referer: { $exists: true, $ne: '' }
            }
          },
          {
            $group: {
              _id: '$referer',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ])
        .toArray(),
    ]);

    const activeSessions = activeSessionsData.length > 0 ? activeSessionsData[0].total : 0;

    // 최근 활동 타임라인 (방문 + 전환 통합)
    const recentActivity = [
      ...recentVisits.map((v: any) => ({
        type: 'visit',
        pathname: v.pathname,
        sessionId: v.sessionId,
        timestamp: v.timestamp,
        referer: v.referer,
      })),
      ...recentConversions.map((c: any) => ({
        type: 'conversion',
        conversionType: c.conversionType,
        sessionId: c.sessionId,
        timestamp: c.timestamp,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 30);

    // 분당 트래픽 (최근 10분)
    const minutelyTraffic = await db.collection('page-visits').aggregate([
      { $match: { timestamp: { $gte: new Date(now.getTime() - 10 * 60 * 1000) } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d %H:%M',
              date: '$timestamp'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    // 요약 통계
    const summary = {
      activeSessions,
      pageViewsInRange: recentVisits.length,
      conversionsInRange: recentConversions.length,
      conversionRate: activeSessions > 0
        ? Math.round((recentConversions.length / activeSessions) * 10000) / 100
        : 0,
    };

    return NextResponse.json({
      success: true,
      timeRange,
      timestamp: now.toISOString(),
      summary,
      recentActivity,
      minutelyTraffic: minutelyTraffic.map((m: any) => ({
        time: m._id,
        count: m.count,
      })),
      topPages: topPagesNow.map((p: any) => ({
        pathname: p._id,
        count: p.count,
      })),
      topReferrers: topReferrersNow.map((r: any) => ({
        referer: r._id,
        count: r.count,
      })),
    });
  } catch (error) {
    console.error('[Analytics/Realtime] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch realtime data' },
      { status: 500 }
    );
  }
}
