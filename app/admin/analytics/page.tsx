'use client';

import { useState, useEffect } from 'react';
import {
  Card, Title, Text, BarList, Flex, Grid
} from '@tremor/react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/**
 * 관리자 종합 분석 대시보드
 *
 * @purpose 마케팅 분석 데이터 표시 (오류 없는 기능만)
 * @context 실시간 접속자, 전환 퍼널은 제외 (오류 발생)
 * @features
 * - UTM 캠페인 성과 Top 5
 * - 인기 페이지 Top 5
 * - 주요 유입 경로 Top 5
 */

interface Campaign {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  sessions: number;
  conversions: number;
  conversionRate: number;
  avgTimeSpent: number;
}

interface LandingPage {
  pathname: string;
  visits: number;
  bounceRate: number;
  avgTimeSpent: number;
  conversionRate: number;
}

interface RealtimeData {
  success: boolean;
  topPages: Array<{ pathname: string; count: number }>;
  topReferrers: Array<{ referer: string; count: number }>;
}

export default function AdminAnalyticsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchCampaigns(),
        fetchLandingPages(),
        fetchRealtimeData(),
      ]);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/analytics/campaigns');
      if (!response.ok) {
        throw new Error(`API 에러: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setCampaigns(data.campaigns || []);
      } else {
        setCampaigns([]);
      }
    } catch (error) {
      console.error('캠페인 데이터 로드 실패:', error);
      setCampaigns([]);
    }
  };

  const fetchLandingPages = async () => {
    try {
      const response = await fetch('/api/analytics/landing-pages');
      if (!response.ok) {
        throw new Error(`API 에러: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setLandingPages(data.landingPages || []);
      } else {
        setLandingPages([]);
      }
    } catch (error) {
      console.error('랜딩 페이지 데이터 로드 실패:', error);
      setLandingPages([]);
    }
  };

  const fetchRealtimeData = async () => {
    try {
      const response = await fetch('/api/analytics/realtime?range=today');
      if (!response.ok) {
        throw new Error(`API 에러: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setRealtimeData(data);
      } else {
        setRealtimeData(null);
      }
    } catch (error) {
      console.error('실시간 데이터 로드 실패:', error);
      setRealtimeData(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-900">종합 분석 대시보드</h1>
          <p className="mt-1 text-sm text-gray-500">UTM 캠페인, 인기 페이지, 유입 경로 분석</p>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner message="데이터 로딩 중..." />
        </div>
      ) : error ? (
        <div className="px-6">
          <Card>
            <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
              <Text className="font-semibold text-red-900">⚠️ 데이터 로드 실패</Text>
              <Text className="text-red-700 mt-2">{error}</Text>
              <Text className="text-red-600 mt-2 text-sm">
                API 엔드포인트를 확인하거나 잠시 후 다시 시도해주세요.
              </Text>
            </div>
          </Card>
        </div>
      ) : (
        <div className="px-6 space-y-6">
          {/* UTM 캠페인 & 인기 페이지 */}
          <Grid numItems={1} numItemsLg={2} className="gap-6">
            <Card>
              <Title>📈 UTM 캠페인 성과 (Top 5)</Title>
              <Text className="text-gray-500 mb-4">어떤 마케팅 채널이 효과적인가?</Text>
              {campaigns.length === 0 ? (
                <Text className="text-gray-500 mt-4">캠페인 데이터가 없습니다</Text>
              ) : (
                <BarList
                  data={campaigns
                    .slice(0, 5)
                    .filter(c => c && c.utmSource && c.utmMedium && typeof c.sessions === 'number')
                    .map(c => ({
                      name: `${c.utmSource} / ${c.utmMedium}`,
                      value: c.sessions,
                      href: '#',
                    }))}
                  className="mt-4"
                />
              )}
            </Card>

            <Card>
              <Title>🔥 인기 페이지 (Top 5)</Title>
              <Text className="text-gray-500 mb-4">가장 많이 방문하는 페이지</Text>
              {landingPages.length === 0 ? (
                <Text className="text-gray-500 mt-4">페이지 데이터가 없습니다</Text>
              ) : (
                <BarList
                  data={landingPages
                    .slice(0, 5)
                    .filter(p => p && p.pathname && typeof p.visits === 'number')
                    .map(p => ({
                      name: p.pathname,
                      value: p.visits,
                    }))}
                  className="mt-4"
                />
              )}
            </Card>
          </Grid>

          {/* 현재 인기 페이지 & 유입 경로 */}
          {realtimeData && realtimeData.topPages && realtimeData.topReferrers && (
            <Grid numItems={1} numItemsLg={2} className="gap-6">
              <Card>
                <Title>🌟 현재 인기 페이지</Title>
                <Text className="text-gray-500 mb-4">오늘 실시간 페이지뷰</Text>
                {realtimeData.topPages.length === 0 ? (
                  <Text className="text-gray-500 mt-4">데이터가 없습니다</Text>
                ) : (
                  <BarList
                    data={realtimeData.topPages
                      .slice(0, 5)
                      .filter(p => p && p.pathname && typeof p.count === 'number')
                      .map(p => ({
                        name: p.pathname || '알 수 없음',
                        value: p.count
                      }))}
                    className="mt-4"
                  />
                )}
              </Card>

              <Card>
                <Title>🔗 주요 유입 경로</Title>
                <Text className="text-gray-500 mb-4">어디서 방문하는가?</Text>
                {realtimeData.topReferrers.length === 0 ? (
                  <Text className="text-gray-500 mt-4">데이터가 없습니다</Text>
                ) : (
                  <BarList
                    data={realtimeData.topReferrers
                      .slice(0, 5)
                      .filter(r => r && r.referer && typeof r.count === 'number')
                      .map(r => ({
                        name: r.referer && r.referer.length > 40
                          ? r.referer.substring(0, 40) + '...'
                          : (r.referer || '직접 접속'),
                        value: r.count
                      }))}
                    className="mt-4"
                  />
                )}
              </Card>
            </Grid>
          )}

          {/* 안내 메시지 */}
          <Card>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Flex>
                <div>
                  <Text className="font-semibold text-blue-900">💡 추가 예정 기능</Text>
                  <Text className="text-blue-700 mt-1">
                    실시간 접속자 현황, 전환 퍼널 분석 등 고급 분석 기능은 데이터가 충분히 누적된 후 추가될 예정입니다.
                  </Text>
                </div>
              </Flex>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
