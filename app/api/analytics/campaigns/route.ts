import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';

/**
 * UTM 캠페인 성과 분석 API
 *
 * @purpose UTM 파라미터 기반 마케팅 캠페인 ROI 측정
 * @context utm_source, utm_medium, utm_campaign 별 세션, 전환율, 체류시간 분석
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') || 'campaign'; // source, medium, campaign

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

    // UTM 데이터가 있는 방문 기록 조회
    const query: any = {};

    if (groupBy === 'source') {
      query.utmSource = { $exists: true, $ne: '' };
    } else if (groupBy === 'medium') {
      query.utmMedium = { $exists: true, $ne: '' };
    } else if (groupBy === 'campaign') {
      query.utmCampaign = { $exists: true, $ne: '' };
    }

    if (Object.keys(dateFilter).length > 0) {
      query.timestamp = dateFilter;
    }

    // 캠페인별 집계
    const groupField = groupBy === 'source'
      ? '$utmSource'
      : groupBy === 'medium'
      ? '$utmMedium'
      : '$utmCampaign';

    const aggregation = await db.collection('page-visits').aggregate([
      { $match: query },
      {
        $group: {
          _id: groupField,
          sessions: { $addToSet: '$sessionId' },
          totalPageViews: { $sum: 1 },
          totalTimeSpent: { $sum: '$timeSpent' },
        }
      },
      {
        $project: {
          name: '$_id',
          sessionCount: { $size: '$sessions' },
          totalPageViews: 1,
          avgTimeSpent: {
            $cond: {
              if: { $gt: [{ $size: '$sessions' }, 0] },
              then: { $divide: ['$totalTimeSpent', { $size: '$sessions' }] },
              else: 0
            }
          },
        }
      },
      { $sort: { sessionCount: -1 } }
    ]).toArray();

    // 각 캠페인별 전환 수 계산
    const campaignsWithConversions = await Promise.all(
      aggregation.map(async (campaign) => {
        // 해당 캠페인의 세션 ID들 가져오기
        const campaignQuery = {
          ...query,
          [groupBy === 'source' ? 'utmSource' : groupBy === 'medium' ? 'utmMedium' : 'utmCampaign']: campaign.name
        };

        const sessions = await db.collection('page-visits')
          .find(campaignQuery)
          .project({ sessionId: 1 })
          .toArray();

        const sessionIds = [...new Set(sessions.map(s => s.sessionId))];

        // 해당 세션들의 전환 수 계산
        const conversions = await db.collection('conversions').countDocuments({
          sessionId: { $in: sessionIds }
        });

        const conversionRate = campaign.sessionCount > 0
          ? (conversions / campaign.sessionCount) * 100
          : 0;

        return {
          name: campaign.name,
          sessions: campaign.sessionCount,
          pageViews: campaign.totalPageViews,
          avgTimeSpent: Math.round(campaign.avgTimeSpent),
          conversions,
          conversionRate: Math.round(conversionRate * 100) / 100,
        };
      })
    );

    // 전체 통계
    const totalStats = campaignsWithConversions.reduce((acc, campaign) => ({
      totalSessions: acc.totalSessions + campaign.sessions,
      totalConversions: acc.totalConversions + campaign.conversions,
      totalPageViews: acc.totalPageViews + campaign.pageViews,
    }), { totalSessions: 0, totalConversions: 0, totalPageViews: 0 });

    const overallConversionRate = totalStats.totalSessions > 0
      ? (totalStats.totalConversions / totalStats.totalSessions) * 100
      : 0;

    return NextResponse.json({
      success: true,
      groupBy,
      campaigns: campaignsWithConversions,
      summary: {
        totalCampaigns: campaignsWithConversions.length,
        totalSessions: totalStats.totalSessions,
        totalConversions: totalStats.totalConversions,
        totalPageViews: totalStats.totalPageViews,
        overallConversionRate: Math.round(overallConversionRate * 100) / 100,
      },
    });
  } catch (error) {
    console.error('[Analytics/Campaigns] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign data' },
      { status: 500 }
    );
  }
}
