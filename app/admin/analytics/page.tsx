'use client';

import { useState, useEffect } from 'react';
import {
  Card, Title, Text, BarList, Metric, Flex, Badge, Grid, Select, SelectItem, LineChart
} from '@tremor/react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/**
 * 관리자 종합 분석 대시보드
 *
 * @purpose 핵심 마케팅 지표를 한눈에 파악할 수 있는 통합 대시보드
 * @context 탭 없이 주요 데이터만 시각화하여 빠른 의사결정 지원
 * @features
 * - 실시간 요약 통계 (접속자, 페이지뷰, 전환, 전환율)
 * - 전환 퍼널 분석 (상담신청, 회원가입, 영상 시청)
 * - 캠페인 성과 Top 5
 * - 인기 페이지 Top 5
 * - 실시간 분당 트래픽
 */

interface FunnelStep {
  id: string;
  name: string;
  count: number;
  conversionRate: number;
  dropOffRate: number;
}

interface FunnelData {
  type: string;
  name: string;
  totalConversionRate: number;
  steps: FunnelStep[];
}

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
  timeRange: string;
  timestamp: string;
  summary: {
    activeSessions: number;
    pageViewsInRange: number;
    conversionsInRange: number;
    conversionRate: number;
  };
  recentActivity: Array<{ type: string; pathname?: string; timestamp: string; sessionId?: string }>;
  minutelyTraffic: Array<{ time: string; count: number }>;
  topPages: Array<{ pathname: string; count: number }>;
  topReferrers: Array<{ referer: string; count: number }>;
}

export default function AdminAnalyticsPage() {
  // 전환 퍼널 상태
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [selectedFunnel, setSelectedFunnel] = useState('consultation');

  // 캠페인 & 랜딩 페이지 상태
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);

  // 실시간 데이터 상태
  const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 초기 데이터 로드
  useEffect(() => {
    loadAllData();

    // 실시간 데이터 10초마다 갱신
    const interval = setInterval(() => {
      fetchRealtimeData();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // 퍼널 타입 변경 시 퍼널 데이터만 다시 로드
  useEffect(() => {
    fetchFunnelData();
  }, [selectedFunnel]);

  /**
   * 모든 데이터 로드
   * @purpose 페이지 최초 로드 시 모든 핵심 데이터 fetch
   */
  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchFunnelData(),
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

  const fetchFunnelData = async () => {
    try {
      const response = await fetch(`/api/analytics/funnel?type=${selectedFunnel}`);
      if (!response.ok) {
        throw new Error(`API 에러: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.funnel) {
        setFunnelData(data.funnel);
      } else {
        setFunnelData(null);
      }
    } catch (error) {
      console.error('퍼널 데이터 로드 실패:', error);
      setFunnelData(null);
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

  // 퍼널 차트 데이터 변환 (안전하게)
  const funnelChartData = funnelData?.steps
    ?.filter(step => step && step.name && typeof step.count === 'number')
    .map(step => ({
      name: step.name,
      value: step.count,
    })) || [];

  return (
    <div className="space-y-6 pb-12">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <Flex justifyContent="between" alignItems="center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">종합 분석 대시보드</h1>
              <p className="mt-1 text-sm text-gray-500">핵심 마케팅 지표를 한눈에 파악</p>
            </div>
            <Badge color="green" size="lg">
              Live • 10초마다 자동 갱신
            </Badge>
          </Flex>
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
          {/* 실시간 요약 통계 */}
          <div>
            <Title className="mb-4">📊 실시간 요약</Title>
            <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-6">
              <Card decoration="top" decorationColor="blue">
                <Text>현재 접속자</Text>
                <Metric className="text-blue-600">
                  {realtimeData?.summary?.activeSessions || 0}
                </Metric>
              </Card>
              <Card decoration="top" decorationColor="green">
                <Text>오늘 페이지뷰</Text>
                <Metric className="text-green-600">
                  {(realtimeData?.summary?.pageViewsInRange || 0).toLocaleString()}
                </Metric>
              </Card>
              <Card decoration="top" decorationColor="purple">
                <Text>오늘 전환</Text>
                <Metric className="text-purple-600">
                  {realtimeData?.summary?.conversionsInRange || 0}
                </Metric>
              </Card>
              <Card decoration="top" decorationColor="orange">
                <Text>전환율</Text>
                <Metric className="text-orange-600">
                  {(realtimeData?.summary?.conversionRate || 0).toFixed(2)}%
                </Metric>
              </Card>
            </Grid>
          </div>

          {/* 전환 퍼널 */}
          <div>
            <Flex justifyContent="between" alignItems="center" className="mb-4">
              <Title>🎯 전환 퍼널 분석</Title>
              <Select
                value={selectedFunnel}
                onValueChange={setSelectedFunnel}
                className="w-64"
              >
                <SelectItem value="consultation">상담신청 퍼널</SelectItem>
                <SelectItem value="signup">회원가입 퍼널</SelectItem>
                <SelectItem value="video_engagement">영상 시청 퍼널</SelectItem>
              </Select>
            </Flex>

            {!funnelData || !funnelData.steps || funnelData.steps.length === 0 ? (
              <Card>
                <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
                  <Text className="font-semibold text-gray-700">📊 퍼널 데이터 없음</Text>
                  <Text className="text-gray-600 mt-2">
                    선택한 퍼널 타입에 대한 데이터가 아직 없습니다.
                  </Text>
                </div>
              </Card>
            ) : (
              <Grid numItems={1} numItemsLg={3} className="gap-6">
                {/* 전체 전환율 */}
                <Card>
                  <Text>전체 전환율</Text>
                  <Metric>{funnelData.totalConversionRate.toFixed(2)}%</Metric>
                  <Flex className="mt-4">
                    <Badge color="blue">
                      {funnelData.steps[0].count.toLocaleString()} 시작
                    </Badge>
                    <Badge color="green">
                      {funnelData.steps[funnelData.steps.length - 1].count.toLocaleString()} 완료
                    </Badge>
                  </Flex>
                </Card>

                {/* 최대 이탈 단계 */}
                <Card>
                  <Text>최대 이탈 단계</Text>
                  <Metric className="text-red-600">
                    {funnelData.steps.reduce((max, step) =>
                      step.dropOffRate > max.dropOffRate ? step : max
                    , funnelData.steps[0]).name}
                  </Metric>
                  <Flex className="mt-4">
                    <Badge color="red">
                      {funnelData.steps.reduce((max, step) =>
                        step.dropOffRate > max.dropOffRate ? step : max
                      , funnelData.steps[0]).dropOffRate.toFixed(1)}% 이탈
                    </Badge>
                  </Flex>
                </Card>

                {/* 평균 단계별 전환율 */}
                <Card>
                  <Text>평균 단계별 전환율</Text>
                  <Metric>
                    {funnelData.steps.length > 1
                      ? (
                          funnelData.steps
                            .slice(1)
                            .reduce((sum, step) => sum + step.conversionRate, 0) /
                          (funnelData.steps.length - 1)
                        ).toFixed(2)
                      : 0}%
                  </Metric>
                </Card>
              </Grid>
            )}

            {funnelData && funnelData.steps && funnelData.steps.length > 0 && funnelChartData.length > 0 && (
              <Card className="mt-6">
                <Title>퍼널 단계별 사용자 수</Title>
                <BarList data={funnelChartData} className="mt-4" />
              </Card>
            )}
          </div>

          {/* 캠페인 & 인기 페이지 */}
          <Grid numItems={1} numItemsLg={2} className="gap-6">
            <Card>
              <Title>📈 UTM 캠페인 성과 (Top 5)</Title>
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

          {/* 실시간 분당 트래픽 */}
          {realtimeData && realtimeData.minutelyTraffic && realtimeData.minutelyTraffic.length > 0 && (
            <Card>
              <Title>⚡ 실시간 분당 트래픽 (최근 10분)</Title>
              <LineChart
                className="mt-4"
                data={realtimeData.minutelyTraffic.filter(t => t && t.time && typeof t.count === 'number')}
                index="time"
                categories={["count"]}
                colors={["blue"]}
                valueFormatter={(value: number) => `${value}회`}
                yAxisWidth={48}
              />
            </Card>
          )}

          {/* 현재 인기 페이지 & 유입 경로 */}
          {realtimeData && realtimeData.topPages && realtimeData.topReferrers && (
            <Grid numItems={1} numItemsLg={2} className="gap-6">
              <Card>
                <Title>🌟 현재 인기 페이지</Title>
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
                {realtimeData.topReferrers.length === 0 ? (
                  <Text className="text-gray-500 mt-4">데이터가 없습니다</Text>
                ) : (
                  <BarList
                    data={realtimeData.topReferrers
                      .slice(0, 5)
                      .filter(r => r && r.referer && typeof r.count === 'number')
                      .map(r => ({
                        name: r.referer && r.referer.length > 40 ? r.referer.substring(0, 40) + '...' : (r.referer || '직접 접속'),
                        value: r.count
                      }))}
                    className="mt-4"
                  />
                )}
              </Card>
            </Grid>
          )}
        </div>
      )}
    </div>
  );
}
