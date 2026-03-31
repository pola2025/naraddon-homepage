import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth-options';
import clientPromise from '@/lib/mongodb-client';
import { UAParser } from 'ua-parser-js';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

/**
 * Umami Analytics 클라이언트
 *
 * @purpose Umami Analytics API와 통신하여 실시간 통계 수집
 */
class UmamiClient {
  private apiUrl: string;
  private websiteId: string;
  private username: string;
  private password: string;
  private token: string | null = null;

  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_UMAMI_URL || 'https://cloud.umami.is';
    this.websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || '';
    this.username = process.env.UMAMI_USERNAME || '';
    this.password = process.env.UMAMI_PASSWORD || '';
  }

  async login() {
    const response = await fetch(`${this.apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: this.username,
        password: this.password,
      }),
    });

    if (!response.ok) {
      throw new Error('Umami 로그인 실패');
    }

    const data = await response.json();
    this.token = data.token;
  }

  async getStats(startDate: number, endDate: number) {
    if (!this.token) await this.login();

    const response = await fetch(
      `${this.apiUrl}/api/websites/${this.websiteId}/stats?startAt=${startDate}&endAt=${endDate}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Umami 통계 조회 실패');
    }

    return await response.json();
  }
}

/**
 * Google Search Console 클라이언트
 *
 * @purpose Google Search Console API와 통신하여 검색 성능 데이터 수집
 */
class GoogleSearchConsoleClient {
  private oauth2Client: any;
  private searchConsole: any;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:3000'
    );

    this.oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    // 올바른 API 버전 사용: searchconsole v1
    this.searchConsole = google.searchconsole({
      version: 'v1',
      auth: this.oauth2Client,
    });
  }

  async getSearchAnalytics(startDate: string, endDate: string) {
    try {
      const response = await this.searchConsole.searchanalytics.query({
        siteUrl: 'sc-domain:naraddon.com', // 도메인 속성 사용
        requestBody: {
          startDate,
          endDate,
          dimensions: ['query'], // 검색어별 집계 (페이지 중복 방지)
          rowLimit: 100,
          dataState: 'final', // 확정 데이터만 사용
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Google Search Console 오류:', error.message);
      return { rows: [] };
    }
  }
}

// GET /api/admin/stats - 관리자 대시보드 통계
export async function GET(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    console.log(
      '[Admin Stats API] Session:',
      session ? { email: session.user?.email } : 'NO SESSION'
    );

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 관리자 권한 확인
    const userRole = (session.user as any)?.role;
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      console.warn(
        `[나라똔:관리자통계] 권한 없는 접근 email=${session.user?.email} role=${userRole}`
      );
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // 날짜 파라미터 파싱 (쿼리스트링에서)
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    // 방문 통계 계산
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 날짜 범위 설정 (URL 파라미터 또는 기본값)
    const filterEndDate = endDateParam ? new Date(endDateParam) : new Date();
    filterEndDate.setHours(23, 59, 59, 999); // 종료일의 마지막 시각
    const filterStartDate = startDateParam
      ? new Date(startDateParam)
      : new Date(filterEndDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 기본 7일
    filterStartDate.setHours(0, 0, 0, 0); // 시작일의 첫 시각

    // 병렬로 통계 데이터 수집
    const [
      totalUsers,
      totalConsultations,
      pendingConsultations,
      totalExaminers,
      totalPolicyNews,
      totalTubeVideos,
      recentUsers,
      recentConsultations,
      todayVisits,
      yesterdayVisits,
      monthlyVisits,
      totalVisits,
      allVisits,
    ] = await Promise.all([
      // 전체 사용자 수
      db.collection('users').countDocuments(),

      // 전체 상담 수
      db.collection('consultations').countDocuments(),

      // 대기 중인 상담 수
      db.collection('consultations').countDocuments({ status: 'pending' }),

      // 인증 심사관 수
      db.collection('certified-examiners').countDocuments({ status: 'active' }),

      // 정책 소식 수
      db.collection('policy-news').countDocuments(),

      // 나라돈 튜브 영상 수 (전체 entries의 videos 배열 합산)
      db
        .collection('naraddon-tube')
        .aggregate([{ $unwind: '$videos' }, { $count: 'total' }])
        .toArray(),

      // 최근 가입 사용자 (5명)
      db
        .collection('users')
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .project({ email: 1, name: 1, createdAt: 1 })
        .toArray(),

      // 최근 상담 신청 (5건)
      db
        .collection('consultations')
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .project({ userEmail: 1, consultationType: 1, status: 1, createdAt: 1 })
        .toArray(),

      // 오늘 방문자 수
      db.collection('page-visits').countDocuments({ timestamp: { $gte: today } }),

      // 어제 방문자 수
      db.collection('page-visits').countDocuments({ timestamp: { $gte: yesterday, $lt: today } }),

      // 이번 달 방문자 수
      db.collection('page-visits').countDocuments({ timestamp: { $gte: thisMonth } }),

      // 전체 방문자 수
      db.collection('page-visits').countDocuments(),

      // 방문 기록 상세 (디바이스 및 유입경로 분석용) - 날짜 필터 적용
      db
        .collection('page-visits')
        .find({
          timestamp: {
            $gte: filterStartDate,
            $lte: filterEndDate,
          },
        })
        .project({ userAgent: 1, referer: 1, pathname: 1, timestamp: 1 })
        .toArray(),
    ]);

    /**
     * 디바이스 타입 분석
     *
     * @purpose 방문자의 디바이스 타입(PC/Mobile/Tablet)을 분석하여 통계 제공
     * @context User-Agent 파싱을 통해 디바이스 타입 식별
     */
    const deviceStats: { [key: string]: number } = {
      mobile: 0,
      desktop: 0,
      tablet: 0,
      unknown: 0,
    };

    /**
     * 유입경로 분석
     *
     * @purpose 방문자가 어디서 유입되었는지 분석
     * @context referer 헤더 기반으로 직접/검색/SNS/기타 분류
     */
    const referrerStats: { [key: string]: number } = {};
    const trafficSourceStats: { [key: string]: number } = {
      direct: 0, // 직접 유입 (Vercel 포함)
      search: 0, // 검색 엔진
      social: 0, // SNS
      other: 0, // 기타
    };

    // 검색 엔진 도메인
    const searchEngines = ['google.', 'naver.', 'daum.', 'bing.', 'yahoo.', 'duckduckgo.'];
    // SNS 도메인
    const socialMedia = [
      'instagram.',
      'facebook.',
      'twitter.',
      'linkedin.',
      'youtube.',
      'kakao.',
      't.co',
    ];
    // Vercel 도메인
    const vercelDomains = ['vercel.app', 'vercel.com'];

    allVisits.forEach((visit: any) => {
      // 디바이스 타입 분석
      if (visit.userAgent) {
        const parser = new UAParser(visit.userAgent);
        const deviceType = parser.getDevice().type;

        if (deviceType === 'mobile') {
          deviceStats.mobile++;
        } else if (deviceType === 'tablet') {
          deviceStats.tablet++;
        } else if (!deviceType) {
          // type이 undefined면 일반적으로 desktop
          deviceStats.desktop++;
        } else {
          deviceStats.unknown++;
        }
      } else {
        deviceStats.unknown++;
      }

      // 유입경로 분석
      if (!visit.referer || visit.referer === '') {
        // 직접 유입 (referer 없음)
        trafficSourceStats.direct++;
      } else {
        try {
          const refererUrl = new URL(visit.referer);
          const refererDomain = refererUrl.hostname;

          // 자체 도메인 필터링 (내부 이동은 제외)
          if (refererDomain.includes('naraddon.com') || refererDomain.includes('localhost')) {
            // 내부 이동은 무시
            return;
          }

          // Vercel 확인 (직접 유입으로 분류)
          if (vercelDomains.some((domain) => refererDomain.includes(domain))) {
            trafficSourceStats.direct++;
            // Vercel은 유입경로 차트에 포함하지 않음
            return;
          }

          // 검색 엔진 확인
          if (searchEngines.some((engine) => refererDomain.includes(engine))) {
            trafficSourceStats.search++;
            if (referrerStats[refererDomain]) {
              referrerStats[refererDomain]++;
            } else {
              referrerStats[refererDomain] = 1;
            }
            return;
          }

          // SNS 확인
          if (socialMedia.some((social) => refererDomain.includes(social))) {
            trafficSourceStats.social++;
            if (referrerStats[refererDomain]) {
              referrerStats[refererDomain]++;
            } else {
              referrerStats[refererDomain] = 1;
            }
            return;
          }

          // 기타
          trafficSourceStats.other++;
          if (referrerStats[refererDomain]) {
            referrerStats[refererDomain]++;
          } else {
            referrerStats[refererDomain] = 1;
          }
        } catch (e) {
          // URL 파싱 실패 시 기타로 분류
          trafficSourceStats.other++;
        }
      }
    });

    // 상위 10개 유입경로만 선택
    const topReferrers = Object.entries(referrerStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([domain, visits]) => ({ domain, visits }));

    /**
     * 페이지뷰 분석
     *
     * @purpose 어떤 페이지가 가장 많이 방문되었는지 분석
     * @context pathname 기반으로 페이지별 방문 횟수 집계
     */
    const pageViewStats: { [key: string]: number } = {};

    allVisits.forEach((visit: any) => {
      if (visit.pathname) {
        const pathname = visit.pathname;
        if (pageViewStats[pathname]) {
          pageViewStats[pathname]++;
        } else {
          pageViewStats[pathname] = 1;
        }
      }
    });

    // 상위 10개 페이지만 선택
    const topPages = Object.entries(pageViewStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pathname, views]) => ({ pathname, views }));

    // 최근 활동 통합 및 정렬
    const recentActivities = [
      ...recentUsers.map((user) => ({
        id: user._id.toString(),
        type: 'user',
        description: '새로운 사용자 가입',
        timestamp: new Date(user.createdAt).toLocaleString('ko-KR'),
        user: user.email || user.name || '알 수 없음',
      })),
      ...recentConsultations.map((consultation) => ({
        id: consultation._id.toString(),
        type: 'consultation',
        description: `새로운 ${consultation.consultationType || '일반'} 상담 신청`,
        timestamp: new Date(consultation.createdAt).toLocaleString('ko-KR'),
        user: consultation.userEmail || '알 수 없음',
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10); // 최근 10개만

    const videoCount = totalTubeVideos.length > 0 ? totalTubeVideos[0].total : 0;

    /**
     * Umami Analytics 데이터 수집 (최근 7일)
     *
     * @purpose 실시간 방문자 및 페이지뷰 통계
     */
    let umamiData = { pageviews: 0, visitors: 0, visits: 0, bounceRate: 0, avgSessionTime: 0 };
    try {
      const umamiClient = new UmamiClient();
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);

      const umamiStats = await umamiClient.getStats(startDate.getTime(), endDate.getTime());

      umamiData = {
        pageviews: umamiStats.pageviews?.value || 0,
        visitors: umamiStats.uniques?.value || 0,
        visits: umamiStats.visits?.value || 0,
        bounceRate: umamiStats.bounces?.value || 0,
        avgSessionTime: Math.round((umamiStats.totaltime?.value || 0) / 1000),
      };
    } catch (error) {
      console.error('Umami Analytics 오류:', error);
    }

    /**
     * Google Search Console 데이터 수집
     *
     * @purpose 검색 유입 키워드 및 성능 통계
     * @context 날짜 범위는 사용자 선택한 범위를 사용 (filterStartDate ~ filterEndDate)
     */
    let googleSearchData = {
      totalClicks: 0,
      totalImpressions: 0,
      avgCTR: '0',
      avgPosition: '0',
      topQueries: [],
    };
    try {
      const gscClient = new GoogleSearchConsoleClient();

      const formatGscDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const gscData = await gscClient.getSearchAnalytics(
        formatGscDate(filterStartDate),
        formatGscDate(filterEndDate)
      );

      console.log(
        '[Google Search Console] 조회 기간:',
        formatGscDate(filterStartDate),
        '~',
        formatGscDate(filterEndDate)
      );
      console.log('[Google Search Console] 응답 데이터:', gscData);

      googleSearchData = {
        totalClicks:
          gscData.rows?.reduce((sum: number, row: any) => sum + (row.clicks || 0), 0) || 0,
        totalImpressions:
          gscData.rows?.reduce((sum: number, row: any) => sum + (row.impressions || 0), 0) || 0,
        avgCTR: gscData.rows?.length
          ? (
              (gscData.rows.reduce((sum: number, row: any) => sum + (row.ctr || 0), 0) /
                gscData.rows.length) *
              100
            ).toFixed(2)
          : '0',
        avgPosition: gscData.rows?.length
          ? (
              gscData.rows.reduce((sum: number, row: any) => sum + (row.position || 0), 0) /
              gscData.rows.length
            ).toFixed(1)
          : '0',
        topQueries:
          gscData.rows
            ?.sort((a: any, b: any) => (b.clicks || 0) - (a.clicks || 0))
            .slice(0, 10)
            .map((row: any) => ({
              query: row.keys?.[0] || '',
              clicks: row.clicks || 0,
              impressions: row.impressions || 0,
              ctr: ((row.ctr || 0) * 100).toFixed(2) + '%',
              position: (row.position || 0).toFixed(1),
            })) || [],
      };
    } catch (error) {
      console.error('Google Search Console 오류:', error);
    }

    /**
     * 마케팅 통계 계산
     *
     * @purpose 세션별 페이지뷰, 체류시간, 바운스율 분석
     * @context sessionId 기반으로 방문자 행동 분석
     */
    // 세션별로 데이터 그룹화
    const sessionData = await db
      .collection('page-visits')
      .find({ sessionId: { $exists: true, $ne: '' } })
      .project({ sessionId: 1, pageViewCount: 1, timeSpent: 1 })
      .toArray();

    // 세션별로 그룹화하여 최대 페이지뷰와 총 체류시간 계산
    const sessionMap: { [key: string]: { maxPageView: number; totalTimeSpent: number } } = {};

    sessionData.forEach((visit: any) => {
      const sid = visit.sessionId;
      if (!sessionMap[sid]) {
        sessionMap[sid] = { maxPageView: 0, totalTimeSpent: 0 };
      }
      // 세션 내 최대 페이지뷰 (마지막 페이지의 pageViewCount)
      if (visit.pageViewCount > sessionMap[sid].maxPageView) {
        sessionMap[sid].maxPageView = visit.pageViewCount;
      }
      // 세션 내 모든 페이지의 체류시간 합산
      sessionMap[sid].totalTimeSpent += visit.timeSpent || 0;
    });

    const sessions = Object.values(sessionMap);
    const totalSessions = sessions.length;

    // 평균 페이지뷰 계산
    const avgPageViews =
      totalSessions > 0
        ? sessions.reduce((sum, session) => sum + session.maxPageView, 0) / totalSessions
        : 0;

    // 평균 체류시간 계산 (초 단위)
    const avgTimeSpent =
      totalSessions > 0
        ? sessions.reduce((sum, session) => sum + session.totalTimeSpent, 0) / totalSessions
        : 0;

    // 바운스율 계산 (1페이지만 보고 나간 세션 비율)
    const bouncedSessions = sessions.filter((session) => session.maxPageView === 1).length;
    const bounceRate = totalSessions > 0 ? (bouncedSessions / totalSessions) * 100 : 0;

    // 날짜 포맷 함수
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return NextResponse.json({
      totalUsers,
      totalConsultations,
      pendingConsultations,
      totalExaminers,
      totalPolicyNews,
      totalTubeVideos: videoCount,
      recentActivities,
      visits: {
        today: todayVisits,
        yesterday: yesterdayVisits,
        thisMonth: monthlyVisits,
        total: totalVisits,
      },
      deviceStats,
      trafficSourceStats,
      topReferrers,
      topPages,
      // 마케팅 통계 추가
      marketingStats: {
        totalSessions,
        avgPageViews: Math.round(avgPageViews * 100) / 100, // 소수점 2자리
        avgTimeSpent: Math.round(avgTimeSpent), // 초 단위 (정수)
        bounceRate: Math.round(bounceRate * 100) / 100, // 퍼센트, 소수점 2자리
      },
      // Umami Analytics 데이터 추가
      umami: umamiData,
      // Google Search Console 데이터 추가
      googleSearch: googleSearchData,
      // 기준 기간 추가
      period: {
        startDate: formatDate(filterStartDate),
        endDate: formatDate(filterEndDate),
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);

    // MongoDB 연결 실패 시 기본값 반환
    return NextResponse.json({
      totalUsers: 0,
      totalConsultations: 0,
      pendingConsultations: 0,
      totalExaminers: 0,
      totalPolicyNews: 0,
      totalTubeVideos: 0,
      recentActivities: [],
      visits: {
        today: 0,
        yesterday: 0,
        thisMonth: 0,
        total: 0,
      },
      deviceStats: {
        mobile: 0,
        desktop: 0,
        tablet: 0,
        unknown: 0,
      },
      trafficSourceStats: {
        direct: 0,
        search: 0,
        social: 0,
        other: 0,
      },
      topReferrers: [],
      topPages: [],
      marketingStats: {
        totalSessions: 0,
        avgPageViews: 0,
        avgTimeSpent: 0,
        bounceRate: 0,
      },
      umami: {
        pageviews: 0,
        visitors: 0,
        visits: 0,
        bounceRate: 0,
        avgSessionTime: 0,
      },
      googleSearch: {
        totalClicks: 0,
        totalImpressions: 0,
        avgCTR: '0',
        avgPosition: '0',
        topQueries: [],
      },
      notice: 'MongoDB 연결 대기 중입니다. 잠시 후 새로고침해주세요.',
    });
  }
}
