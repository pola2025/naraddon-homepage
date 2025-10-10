import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';

/**
 * 사용자 여정 분석 API
 *
 * @purpose 전환한 사용자와 이탈한 사용자의 경로 비교
 * @context Sankey Diagram 또는 Path Analysis로 시각화
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'converted'; // converted, bounced, all
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const maxSteps = parseInt(searchParams.get('maxSteps') || '5', 10);

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

    // 전환한 세션 ID 가져오기
    const convertedSessionIds = await db.collection('conversions')
      .distinct('sessionId', Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {});

    // 세션 필터링
    let sessionFilter: any = {};
    if (type === 'converted') {
      sessionFilter = { sessionId: { $in: convertedSessionIds } };
    } else if (type === 'bounced') {
      // 전환하지 않은 세션
      sessionFilter = { sessionId: { $nin: convertedSessionIds } };
    }

    if (Object.keys(dateFilter).length > 0) {
      sessionFilter.timestamp = dateFilter;
    }

    // 세션별 페이지 경로 수집
    const sessions = await db.collection('page-visits').aggregate([
      { $match: sessionFilter },
      { $sort: { sessionId: 1, pageViewCount: 1 } },
      {
        $group: {
          _id: '$sessionId',
          path: { $push: '$pathname' },
          pageViews: { $sum: 1 },
          totalTimeSpent: { $sum: '$timeSpent' },
        }
      },
      { $limit: 1000 } // 너무 많은 세션은 제한
    ]).toArray();

    // 경로 패턴 분석 (최대 maxSteps 단계까지)
    const pathPatterns: { [key: string]: number } = {};
    const pathDetails: { [key: string]: { count: number; avgTime: number; avgPages: number } } = {};

    sessions.forEach((session: any) => {
      const path = session.path.slice(0, maxSteps);
      const pathKey = path.join(' → ');

      if (!pathPatterns[pathKey]) {
        pathPatterns[pathKey] = 0;
        pathDetails[pathKey] = {
          count: 0,
          avgTime: 0,
          avgPages: 0,
        };
      }

      pathPatterns[pathKey]++;
      pathDetails[pathKey].count++;
      pathDetails[pathKey].avgTime += session.totalTimeSpent;
      pathDetails[pathKey].avgPages += session.pageViews;
    });

    // 평균 계산
    Object.keys(pathDetails).forEach(key => {
      const detail = pathDetails[key];
      detail.avgTime = Math.round(detail.avgTime / detail.count);
      detail.avgPages = Math.round((detail.avgPages / detail.count) * 10) / 10;
    });

    // 상위 경로 추출
    const topPaths = Object.entries(pathPatterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([path, count]) => ({
        path,
        count,
        percentage: Math.round((count / sessions.length) * 10000) / 100,
        avgTimeSpent: pathDetails[path].avgTime,
        avgPageViews: pathDetails[path].avgPages,
      }));

    // 페이지 간 전환 분석 (Sankey Diagram용)
    const transitions: { [key: string]: number } = {};

    sessions.forEach((session: any) => {
      for (let i = 0; i < session.path.length - 1 && i < maxSteps - 1; i++) {
        const from = session.path[i];
        const to = session.path[i + 1];
        const key = `${from}|||${to}`; // 구분자로 |||사용

        transitions[key] = (transitions[key] || 0) + 1;
      }
    });

    const topTransitions = Object.entries(transitions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([key, count]) => {
        const [from, to] = key.split('|||');
        return {
          from,
          to,
          count,
          percentage: Math.round((count / sessions.length) * 10000) / 100,
        };
      });

    // 요약 통계
    const summary = {
      totalSessions: sessions.length,
      avgPathLength: sessions.length > 0
        ? Math.round((sessions.reduce((sum: number, s: any) => sum + s.pageViews, 0) / sessions.length) * 10) / 10
        : 0,
      avgSessionTime: sessions.length > 0
        ? Math.round(sessions.reduce((sum: number, s: any) => sum + s.totalTimeSpent, 0) / sessions.length)
        : 0,
      conversionRate: type === 'all' && sessions.length > 0
        ? Math.round((convertedSessionIds.length / sessions.length) * 10000) / 100
        : null,
    };

    return NextResponse.json({
      success: true,
      type,
      summary,
      topPaths,
      transitions: topTransitions,
    });
  } catch (error) {
    console.error('[Analytics/UserJourney] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user journey data' },
      { status: 500 }
    );
  }
}
