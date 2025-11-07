/**
 * 통합 Analytics API 엔드포인트
 *
 * @purpose Google Search Console + Umami Analytics 데이터 통합 제공
 * @context Admin 대시보드에서 사이트 통계 조회
 * @returns JSON 형식의 통합 분석 데이터
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

/**
 * Umami Analytics 클라이언트
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

  /**
   * 로그인하여 토큰 획득
   */
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

  /**
   * 통계 데이터 조회
   */
  async getStats(startDate: number, endDate: number) {
    if (!this.token) await this.login();

    const response = await fetch(
      `${this.apiUrl}/api/websites/${this.websiteId}/stats?startAt=${startDate}&endAt=${endDate}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
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

  /**
   * 검색 분석 데이터 조회
   */
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

/**
 * GET /api/analytics
 *
 * 쿼리 파라미터:
 * - startDate: YYYY-MM-DD (기본값: 7일 전)
 * - endDate: YYYY-MM-DD (기본값: 오늘)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // 날짜 파라미터 파싱
    const endDate = new Date(searchParams.get('endDate') || Date.now());
    const startDate = new Date(
      searchParams.get('startDate') || endDate.getTime() - 7 * 24 * 60 * 60 * 1000
    );

    // 날짜 포맷 변환
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);

    // 1. Umami Analytics 데이터 조회
    const umamiClient = new UmamiClient();
    const umamiStats = await umamiClient.getStats(
      startDate.getTime(),
      endDate.getTime()
    );

    // 2. Google Search Console 데이터 조회
    const gscClient = new GoogleSearchConsoleClient();
    const gscData = await gscClient.getSearchAnalytics(
      formattedStartDate,
      formattedEndDate
    );

    // 3. 통합 데이터 응답
    const analyticsData = {
      period: {
        startDate: formattedStartDate,
        endDate: formattedEndDate,
      },
      umami: {
        pageviews: umamiStats.pageviews?.value || 0,
        visitors: umamiStats.uniques?.value || 0,
        visits: umamiStats.visits?.value || 0,
        bounceRate: umamiStats.bounces?.value || 0,
        avgSessionTime: Math.round((umamiStats.totaltime?.value || 0) / 1000),
      },
      googleSearch: {
        totalClicks: gscData.rows?.reduce((sum: number, row: any) => sum + (row.clicks || 0), 0) || 0,
        totalImpressions: gscData.rows?.reduce((sum: number, row: any) => sum + (row.impressions || 0), 0) || 0,
        avgCTR: gscData.rows?.length
          ? (gscData.rows.reduce((sum: number, row: any) => sum + (row.ctr || 0), 0) / gscData.rows.length * 100).toFixed(2)
          : 0,
        avgPosition: gscData.rows?.length
          ? (gscData.rows.reduce((sum: number, row: any) => sum + (row.position || 0), 0) / gscData.rows.length).toFixed(1)
          : 0,
        topQueries: gscData.rows
          ?.sort((a: any, b: any) => (b.clicks || 0) - (a.clicks || 0))
          .slice(0, 10)
          .map((row: any) => ({
            query: row.keys?.[0] || '',
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: ((row.ctr || 0) * 100).toFixed(2) + '%',
            position: (row.position || 0).toFixed(1),
          })) || [],
      },
    };

    return NextResponse.json(analyticsData);

  } catch (error: any) {
    console.error('Analytics API 오류:', error);
    return NextResponse.json(
      {
        error: 'Analytics 데이터 조회 실패',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
