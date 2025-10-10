import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';

/**
 * 코호트 & 유지율 분석 API
 *
 * @purpose 시간별 사용자 그룹의 재방문 패턴 분석
 * @context D1, D7, D30 재방문율로 사용자 리텐션 측정
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cohortBy = searchParams.get('cohortBy') || 'week'; // day, week, month
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    // 날짜 범위 설정
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }

    // 세션별 첫 방문일 찾기
    const firstVisits = await db.collection('page-visits').aggregate([
      Object.keys(dateFilter).length > 0 ? { $match: { timestamp: dateFilter } } : { $match: {} },
      { $sort: { sessionId: 1, timestamp: 1 } },
      {
        $group: {
          _id: '$sessionId',
          firstVisit: { $first: '$timestamp' },
          firstPage: { $first: '$pathname' },
        }
      }
    ]).toArray();

    // 코호트 그룹 생성
    const cohorts: { [key: string]: string[] } = {};

    firstVisits.forEach((visit: any) => {
      const date = new Date(visit.firstVisit);
      let cohortKey: string;

      if (cohortBy === 'day') {
        cohortKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (cohortBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // 주의 시작 (일요일)
        cohortKey = weekStart.toISOString().split('T')[0];
      } else { // month
        cohortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!cohorts[cohortKey]) {
        cohorts[cohortKey] = [];
      }
      cohorts[cohortKey].push(visit._id);
    });

    // 코호트별 유지율 계산
    const cohortAnalysis = await Promise.all(
      Object.entries(cohorts).map(async ([cohortDate, sessionIds]) => {
        const cohortStartDate = new Date(cohortDate);

        // D1, D7, D30 재방문 계산
        const retention = {
          d1: 0,
          d7: 0,
          d30: 0,
        };

        // D1 (1일 후)
        const d1Start = new Date(cohortStartDate);
        d1Start.setDate(d1Start.getDate() + 1);
        const d1End = new Date(d1Start);
        d1End.setDate(d1End.getDate() + 1);

        retention.d1 = await db.collection('page-visits').countDocuments({
          sessionId: { $in: sessionIds },
          timestamp: { $gte: d1Start, $lt: d1End },
        });

        // D7 (7일 후)
        const d7Start = new Date(cohortStartDate);
        d7Start.setDate(d7Start.getDate() + 7);
        const d7End = new Date(d7Start);
        d7End.setDate(d7End.getDate() + 1);

        retention.d7 = await db.collection('page-visits').countDocuments({
          sessionId: { $in: sessionIds },
          timestamp: { $gte: d7Start, $lt: d7End },
        });

        // D30 (30일 후)
        const d30Start = new Date(cohortStartDate);
        d30Start.setDate(d30Start.getDate() + 30);
        const d30End = new Date(d30Start);
        d30End.setDate(d30End.getDate() + 1);

        retention.d30 = await db.collection('page-visits').countDocuments({
          sessionId: { $in: sessionIds },
          timestamp: { $gte: d30Start, $lt: d30End },
        });

        const totalSessions = sessionIds.length;

        return {
          cohortDate,
          totalSessions,
          retention: {
            d1: {
              count: retention.d1,
              rate: totalSessions > 0 ? Math.round((retention.d1 / totalSessions) * 10000) / 100 : 0,
            },
            d7: {
              count: retention.d7,
              rate: totalSessions > 0 ? Math.round((retention.d7 / totalSessions) * 10000) / 100 : 0,
            },
            d30: {
              count: retention.d30,
              rate: totalSessions > 0 ? Math.round((retention.d30 / totalSessions) * 10000) / 100 : 0,
            },
          },
        };
      })
    );

    // 날짜순 정렬
    cohortAnalysis.sort((a, b) => new Date(a.cohortDate).getTime() - new Date(b.cohortDate).getTime());

    // 전체 평균 유지율
    const avgRetention = {
      d1: cohortAnalysis.length > 0
        ? Math.round((cohortAnalysis.reduce((sum, c) => sum + c.retention.d1.rate, 0) / cohortAnalysis.length) * 100) / 100
        : 0,
      d7: cohortAnalysis.length > 0
        ? Math.round((cohortAnalysis.reduce((sum, c) => sum + c.retention.d7.rate, 0) / cohortAnalysis.length) * 100) / 100
        : 0,
      d30: cohortAnalysis.length > 0
        ? Math.round((cohortAnalysis.reduce((sum, c) => sum + c.retention.d30.rate, 0) / cohortAnalysis.length) * 100) / 100
        : 0,
    };

    return NextResponse.json({
      success: true,
      cohortBy,
      cohorts: cohortAnalysis,
      summary: {
        totalCohorts: cohortAnalysis.length,
        totalSessions: cohortAnalysis.reduce((sum, c) => sum + c.totalSessions, 0),
        avgRetention,
      },
    });
  } catch (error) {
    console.error('[Analytics/Cohorts] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cohort data' },
      { status: 500 }
    );
  }
}
