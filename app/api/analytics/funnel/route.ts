import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';

/**
 * 전환 퍼널 분석 API
 *
 * @purpose 사용자의 전환 경로를 단계별로 분석
 * @context 상담신청, 회원가입 등의 퍼널 전환율 측정
 */

/**
 * 퍼널 정의
 */
const FUNNELS = {
  consultation: {
    name: '상담신청 퍼널',
    steps: [
      { id: 'landing', name: '홈페이지 방문', page: '/' },
      { id: 'policy_view', name: '정책분석 조회', conversion: 'policy_view' },
      { id: 'consultation_start', name: '상담신청 시작', conversion: 'consultation_start' },
      { id: 'consultation_submit', name: '상담신청 완료', conversion: 'consultation_submit' },
    ],
  },
  signup: {
    name: '회원가입 퍼널',
    steps: [
      { id: 'landing', name: '홈페이지 방문', page: '/' },
      { id: 'signup_start', name: '회원가입 시작', page: '/auth/signin' },
      { id: 'signup_complete', name: '회원가입 완료', conversion: 'signup' },
    ],
  },
  video_engagement: {
    name: '영상 시청 퍼널',
    steps: [
      { id: 'landing', name: '홈페이지 방문', page: '/' },
      { id: 'tube_page', name: '나라돈 튜브 진입', page: '/naraddon-tube' },
      { id: 'video_watch', name: '영상 시청 (30초+)', conversion: 'video_watch' },
    ],
  },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const funnelType = searchParams.get('type') || 'consultation';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 퍼널 정의 가져오기
    const funnel = FUNNELS[funnelType as keyof typeof FUNNELS];
    if (!funnel) {
      return NextResponse.json(
        { error: 'Invalid funnel type' },
        { status: 400 }
      );
    }

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

    // 퍼널 데이터 계산
    const funnelData = await Promise.all(
      funnel.steps.map(async (step, index) => {
        let count = 0;

        if (step.page) {
          // 페이지 방문 기준
          const query: any = { pathname: step.page };
          if (Object.keys(dateFilter).length > 0) {
            query.timestamp = dateFilter;
          }
          count = await db.collection('page-visits').countDocuments(query);
        } else if (step.conversion) {
          // 전환 이벤트 기준
          const query: any = { conversionType: step.conversion };
          if (Object.keys(dateFilter).length > 0) {
            query.timestamp = dateFilter;
          }
          count = await db.collection('conversions').countDocuments(query);
        }

        // 전환율 계산 (이전 단계 대비)
        let conversionRate = 0;
        if (index > 0 && funnelData[index - 1]) {
          const previousCount = funnelData[index - 1].count;
          if (previousCount > 0) {
            conversionRate = (count / previousCount) * 100;
          }
        } else if (index === 0) {
          conversionRate = 100; // 첫 단계는 항상 100%
        }

        return {
          id: step.id,
          name: step.name,
          count,
          conversionRate: Math.round(conversionRate * 100) / 100,
          dropOffRate: Math.round((100 - conversionRate) * 100) / 100,
        };
      })
    );

    // 전체 퍼널 전환율 계산
    const totalConversionRate =
      funnelData.length > 0 && funnelData[0].count > 0
        ? (funnelData[funnelData.length - 1].count / funnelData[0].count) * 100
        : 0;

    return NextResponse.json({
      success: true,
      funnel: {
        type: funnelType,
        name: funnel.name,
        totalConversionRate: Math.round(totalConversionRate * 100) / 100,
        steps: funnelData,
      },
    });
  } catch (error) {
    console.error('[Analytics/Funnel] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch funnel data' },
      { status: 500 }
    );
  }
}
