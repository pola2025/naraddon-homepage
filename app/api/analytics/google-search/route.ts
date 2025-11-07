/**
 * Google Search Console API 엔드포인트
 *
 * @purpose Google Search Console에서 검색어 데이터를 가져옴
 * @context 나라똔 웹사이트의 검색 유입 키워드 분석
 * @returns 최근 28일간 상위 10개 검색어와 클릭/노출 수 데이터
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  try {
    // 환경변수 확인
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      return NextResponse.json(
        { error: 'Google API credentials not configured' },
        { status: 500 }
      );
    }

    // OAuth2 클라이언트 설정
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'http://localhost' // Desktop App redirect URI
    );

    // Refresh Token 설정
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    // Search Console API 클라이언트 생성
    const searchConsole = google.searchconsole({
      version: 'v1',
      auth: oauth2Client,
    });

    // 날짜 범위 설정 (최근 28일)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 28);

    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    // Search Console API 호출
    const response = await searchConsole.searchanalytics.query({
      siteUrl: 'sc-domain:naraddon.com', // 도메인 속성
      requestBody: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['query'], // 검색어별 데이터
        rowLimit: 10, // 상위 10개
        dataState: 'final', // 확정 데이터만
      },
    });

    // 결과 반환
    const queries = response.data.rows || [];

    return NextResponse.json({
      success: true,
      dateRange: {
        start: formatDate(startDate),
        end: formatDate(endDate),
      },
      queries: queries.map((row: any) => ({
        query: row.keys[0], // 검색어
        clicks: row.clicks, // 클릭 수
        impressions: row.impressions, // 노출 수
        ctr: row.ctr, // 클릭률
        position: row.position, // 평균 순위
      })),
    });
  } catch (error: any) {
    console.error('Google Search Console API Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch Google Search Console data',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
