import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';

/**
 * 시간대별 트래픽 분석 API
 *
 * @purpose 시간대(시간, 요일)별 방문자 패턴 분석
 * @context 최적 콘텐츠 발행 시간 및 마케팅 캠페인 스케줄링에 활용
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type') || 'hourly'; // hourly, daily, heatmap

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

    if (type === 'hourly') {
      // 시간대별 트래픽 (0-23시)
      const hourlyData = await db.collection('page-visits').aggregate([
        { $match: query },
        {
          $project: {
            hour: { $hour: '$timestamp' },
            sessionId: 1,
            timeSpent: 1,
          }
        },
        {
          $group: {
            _id: '$hour',
            visits: { $sum: 1 },
            sessions: { $addToSet: '$sessionId' },
            avgTimeSpent: { $avg: '$timeSpent' },
          }
        },
        {
          $project: {
            hour: '$_id',
            visits: 1,
            sessions: { $size: '$sessions' },
            avgTimeSpent: { $round: ['$avgTimeSpent', 0] },
          }
        },
        { $sort: { hour: 1 } }
      ]).toArray();

      // 0-23시 모든 시간대 포함 (데이터 없는 시간대는 0으로)
      const fullHourlyData = Array.from({ length: 24 }, (_, hour) => {
        const data = hourlyData.find(d => d.hour === hour);
        return {
          hour,
          visits: data?.visits || 0,
          sessions: data?.sessions || 0,
          avgTimeSpent: data?.avgTimeSpent || 0,
        };
      });

      return NextResponse.json({
        success: true,
        type: 'hourly',
        data: fullHourlyData,
      });
    }

    if (type === 'daily') {
      // 요일별 트래픽 (0=일요일, 6=토요일)
      const dailyData = await db.collection('page-visits').aggregate([
        { $match: query },
        {
          $project: {
            dayOfWeek: { $dayOfWeek: '$timestamp' },
            sessionId: 1,
            timeSpent: 1,
          }
        },
        {
          $group: {
            _id: '$dayOfWeek',
            visits: { $sum: 1 },
            sessions: { $addToSet: '$sessionId' },
            avgTimeSpent: { $avg: '$timeSpent' },
          }
        },
        {
          $project: {
            dayOfWeek: '$_id',
            visits: 1,
            sessions: { $size: '$sessions' },
            avgTimeSpent: { $round: ['$avgTimeSpent', 0] },
          }
        },
        { $sort: { dayOfWeek: 1 } }
      ]).toArray();

      const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

      // 모든 요일 포함
      const fullDailyData = Array.from({ length: 7 }, (_, dayIndex) => {
        const data = dailyData.find(d => d.dayOfWeek === dayIndex + 1); // MongoDB는 1부터 시작
        return {
          dayOfWeek: dayIndex,
          dayName: dayNames[dayIndex],
          visits: data?.visits || 0,
          sessions: data?.sessions || 0,
          avgTimeSpent: data?.avgTimeSpent || 0,
        };
      });

      return NextResponse.json({
        success: true,
        type: 'daily',
        data: fullDailyData,
      });
    }

    if (type === 'heatmap') {
      // 요일 × 시간대 히트맵
      const heatmapData = await db.collection('page-visits').aggregate([
        { $match: query },
        {
          $project: {
            dayOfWeek: { $dayOfWeek: '$timestamp' },
            hour: { $hour: '$timestamp' },
            sessionId: 1,
          }
        },
        {
          $group: {
            _id: {
              dayOfWeek: '$dayOfWeek',
              hour: '$hour',
            },
            visits: { $sum: 1 },
            sessions: { $addToSet: '$sessionId' },
          }
        },
        {
          $project: {
            dayOfWeek: '$_id.dayOfWeek',
            hour: '$_id.hour',
            visits: 1,
            sessions: { $size: '$sessions' },
          }
        }
      ]).toArray();

      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

      // 히트맵 형식으로 변환
      const heatmap = [];
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          const data = heatmapData.find(
            d => d.dayOfWeek === day + 1 && d.hour === hour
          );
          heatmap.push({
            dayOfWeek: day,
            dayName: dayNames[day],
            hour,
            visits: data?.visits || 0,
            sessions: data?.sessions || 0,
          });
        }
      }

      return NextResponse.json({
        success: true,
        type: 'heatmap',
        data: heatmap,
      });
    }

    return NextResponse.json(
      { error: 'Invalid type parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Analytics/TimeTraffic] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time traffic data' },
      { status: 500 }
    );
  }
}
