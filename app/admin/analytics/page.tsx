'use client';

import { useState, useEffect } from 'react';
import {
  Card, Title, Text, BarList, Metric, Flex, Badge, Grid, Select, SelectItem,
  TabGroup, TabList, Tab, TabPanels, TabPanel,
  Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell,
  AreaChart, BarChart, DonutChart, LineChart
} from '@tremor/react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/**
 * 관리자 분석 대시보드
 *
 * @purpose 전환 퍼널, 캠페인 성과, 사용자 여정 등 종합 마케팅 분석
 * @context Tremor 라이브러리를 사용한 고급 시각화
 * @features
 * - 전환 퍼널 분석
 * - UTM 캠페인 성과
 * - 시간대별 트래픽
 * - 랜딩 페이지 분석
 * - 이탈 페이지 분석
 * - 사용자 여정
 * - 코호트 & 유지율
 * - 실시간 모니터링
 */

// 탭 타입 정의
type AnalyticsTab = 'funnel' | 'campaigns' | 'time-traffic' | 'landing' | 'exit' | 'journey' | 'cohorts' | 'realtime';

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

interface TimeTrafficData {
  hourlyData: Array<{ hour: number; visits: number; conversions: number }>;
  weeklyData: Array<{ day: string; visits: number; conversions: number }>;
}

interface LandingPage {
  pathname: string;
  visits: number;
  bounceRate: number;
  avgTimeSpent: number;
  conversionRate: number;
}

interface ExitPage {
  pathname: string;
  exitCount: number;
  exitRate: number;
  avgTimeBeforeExit: number;
}

interface UserJourney {
  path: string[];
  count: number;
  conversionRate: number;
  avgTimeSpent: number;
}

interface CohortData {
  cohortDate: string;
  totalUsers: number;
  day1Retention: number;
  day7Retention: number;
  day30Retention: number;
}

interface RealtimeData {
  activeUsers: number;
  recentPageViews: Array<{ pathname: string; timestamp: string; userId?: string }>;
  recentConversions: Array<{ type: string; timestamp: string; value?: number }>;
  topPages: Array<{ pathname: string; count: number }>;
}

export default function AdminAnalyticsPage() {
  // 탭 상태
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('funnel');

  // 전환 퍼널 상태
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [selectedFunnel, setSelectedFunnel] = useState('consultation');

  // 캠페인 상태
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // 시간대별 트래픽 상태
  const [timeTraffic, setTimeTraffic] = useState<TimeTrafficData | null>(null);

  // 랜딩 페이지 상태
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);

  // 이탈 페이지 상태
  const [exitPages, setExitPages] = useState<ExitPage[]>([]);

  // 사용자 여정 상태
  const [userJourneys, setUserJourneys] = useState<UserJourney[]>([]);

  // 코호트 상태
  const [cohorts, setCohorts] = useState<CohortData[]>([]);

  // 실시간 상태
  const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 탭 변경 시 데이터 로드
  useEffect(() => {
    loadTabData();
  }, [activeTab, selectedFunnel]);

  // 실시간 탭은 10초마다 자동 갱신
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTab === 'realtime') {
      interval = setInterval(() => {
        fetchRealtimeData();
      }, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab]);

  /**
   * 탭에 따라 필요한 데이터 로드
   * @purpose 탭 전환 시 해당 탭의 데이터만 fetch하여 성능 최적화
   */
  const loadTabData = async () => {
    setLoading(true);
    setError(null);
    try {
      switch (activeTab) {
        case 'funnel':
          await fetchFunnelData();
          break;
        case 'campaigns':
          await fetchCampaigns();
          break;
        case 'time-traffic':
          await fetchTimeTraffic();
          break;
        case 'landing':
          await fetchLandingPages();
          break;
        case 'exit':
          await fetchExitPages();
          break;
        case 'journey':
          await fetchUserJourneys();
          break;
        case 'cohorts':
          await fetchCohorts();
          break;
        case 'realtime':
          await fetchRealtimeData();
          break;
      }
    } catch (error) {
      console.error('Failed to load tab data:', error);
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
      throw error;
    }
  };

  const fetchCampaigns = async () => {
    const response = await fetch('/api/analytics/campaigns');
    const data = await response.json();
    if (data.success) {
      setCampaigns(data.campaigns || []);
    }
  };

  const fetchTimeTraffic = async () => {
    const response = await fetch('/api/analytics/time-traffic');
    const data = await response.json();
    if (data.success) {
      setTimeTraffic(data);
    }
  };

  const fetchLandingPages = async () => {
    const response = await fetch('/api/analytics/landing-pages');
    const data = await response.json();
    if (data.success) {
      setLandingPages(data.landingPages || []);
    }
  };

  const fetchExitPages = async () => {
    const response = await fetch('/api/analytics/exit-pages');
    const data = await response.json();
    if (data.success) {
      setExitPages(data.exitPages || []);
    }
  };

  const fetchUserJourneys = async () => {
    const response = await fetch('/api/analytics/user-journey');
    const data = await response.json();
    if (data.success) {
      setUserJourneys(data.journeys || []);
    }
  };

  const fetchCohorts = async () => {
    const response = await fetch('/api/analytics/cohorts');
    const data = await response.json();
    if (data.success) {
      setCohorts(data.cohorts || []);
    }
  };

  const fetchRealtimeData = async () => {
    const response = await fetch('/api/analytics/realtime');
    const data = await response.json();
    if (data.success) {
      setRealtimeData(data);
    }
  };

  // 퍼널 차트 데이터 변환
  const funnelChartData = funnelData?.steps.map(step => ({
    name: step.name,
    value: step.count,
  })) || [];

  return (
    <div className="space-y-6 pb-12">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-900">종합 분석 대시보드</h1>
          <p className="mt-1 text-sm text-gray-500">전환 퍼널, 캠페인 성과, 사용자 여정 등 고급 마케팅 분석</p>
        </div>
      </header>

      <div className="px-6 space-y-6">
        {/* 탭 네비게이션 */}
        <Card>
          <TabGroup
            index={['funnel', 'campaigns', 'time-traffic', 'landing', 'exit', 'journey', 'cohorts', 'realtime'].indexOf(activeTab)}
            onIndexChange={(index) => {
              const tabs: AnalyticsTab[] = ['funnel', 'campaigns', 'time-traffic', 'landing', 'exit', 'journey', 'cohorts', 'realtime'];
              setActiveTab(tabs[index]);
            }}
          >
            <TabList className="mt-2">
              <Tab>전환 퍼널</Tab>
              <Tab>UTM 캠페인</Tab>
              <Tab>시간대별 트래픽</Tab>
              <Tab>랜딩 페이지</Tab>
              <Tab>이탈 페이지</Tab>
              <Tab>사용자 여정</Tab>
              <Tab>코호트 & 유지율</Tab>
              <Tab>실시간 모니터링</Tab>
            </TabList>

            <TabPanels>
              {/* ===== 탭 1: 전환 퍼널 ===== */}
              <TabPanel>
                {loading ? (
                  <LoadingSpinner message="퍼널 데이터 로딩 중..." />
                ) : error ? (
                  <div className="mt-6">
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
                ) : !funnelData || !funnelData.steps || funnelData.steps.length === 0 ? (
                  <div className="mt-6">
                    <Card>
                      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
                        <Text className="font-semibold text-gray-700">📊 퍼널 데이터 없음</Text>
                        <Text className="text-gray-600 mt-2">
                          선택한 퍼널 타입에 대한 데이터가 아직 없습니다.
                        </Text>
                      </div>
                    </Card>
                  </div>
                ) : (
                  <div className="space-y-6 mt-6">
                    {/* 퍼널 선택 */}
                    <Flex justifyContent="between" alignItems="center">
                      <div>
                        <Title>전환 퍼널 분석</Title>
                        <Text>사용자의 전환 경로를 단계별로 분석합니다</Text>
                      </div>
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

                    {/* 전체 전환율 */}
                    <Grid numItems={1} numItemsSm={3} className="gap-6">
                      <Card>
                        <Text>전체 전환율</Text>
                        <Metric>{funnelData.totalConversionRate.toFixed(2)}%</Metric>
                        <Flex className="mt-4">
                          <Text>
                            <Badge color="blue">
                              {funnelData.steps[0].count.toLocaleString()} 시작
                            </Badge>
                          </Text>
                          <Text>
                            <Badge color="green">
                              {funnelData.steps[funnelData.steps.length - 1].count.toLocaleString()} 완료
                            </Badge>
                          </Text>
                        </Flex>
                      </Card>

                      <Card>
                        <Text>최대 이탈 단계</Text>
                        <Metric>
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

                    {/* 퍼널 시각화 */}
                    <Grid numItems={1} numItemsLg={2} className="gap-6">
                      <Card>
                        <Title>퍼널 단계별 사용자 수</Title>
                        <BarList data={funnelChartData} className="mt-4" />
                      </Card>

                      <Card>
                        <Title>단계별 전환율</Title>
                        <div className="mt-4 space-y-3">
                          {funnelData.steps.map((step, index) => (
                            <div key={step.id}>
                              <Flex>
                                <Text>{step.name}</Text>
                                <Text>{step.conversionRate.toFixed(1)}%</Text>
                              </Flex>
                              <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    step.conversionRate >= 70
                                      ? 'bg-green-500'
                                      : step.conversionRate >= 40
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${step.conversionRate}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </Grid>

                    {/* 퍼널 상세 테이블 */}
                    <Card>
                      <Title>퍼널 상세 분석</Title>
                      <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                단계
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                사용자 수
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                전환율
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                이탈률
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                이탈 사용자 수
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {funnelData.steps.map((step, index) => {
                              const dropOffCount = index > 0
                                ? funnelData.steps[index - 1].count - step.count
                                : 0;

                              return (
                                <tr key={step.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {step.name}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {step.count.toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <Badge
                                      color={
                                        step.conversionRate >= 70
                                          ? 'green'
                                          : step.conversionRate >= 40
                                          ? 'yellow'
                                          : 'red'
                                      }
                                    >
                                      {step.conversionRate.toFixed(1)}%
                                    </Badge>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {step.dropOffRate.toFixed(1)}%
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {dropOffCount > 0 ? dropOffCount.toLocaleString() : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </Card>

                    {/* 개선 제안 */}
                    <Card>
                      <Title>개선 제안</Title>
                      <div className="mt-4 space-y-3">
                        {funnelData.steps.map((step, index) => {
                          if (step.dropOffRate > 50 && index > 0) {
                            return (
                              <div
                                key={step.id}
                                className="p-4 bg-red-50 border border-red-200 rounded-lg"
                              >
                                <Flex>
                                  <div>
                                    <Text className="font-semibold text-red-900">
                                      ⚠️ {step.name} 단계 이탈률 높음
                                    </Text>
                                    <Text className="text-red-700 mt-1">
                                      {step.dropOffRate.toFixed(1)}%의 사용자가 이 단계에서 이탈합니다.
                                      UX 개선이 필요합니다.
                                    </Text>
                                  </div>
                                </Flex>
                              </div>
                            );
                          }
                          return null;
                        })}

                        {funnelData && funnelData.totalConversionRate < 10 && (
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <Text className="font-semibold text-yellow-900">
                              💡 전체 전환율 개선 필요
                            </Text>
                            <Text className="text-yellow-700 mt-1">
                              전체 전환율이 {funnelData.totalConversionRate.toFixed(1)}%로 낮습니다.
                              각 단계별 사용자 경험을 점검해보세요.
                            </Text>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                )}
              </TabPanel>

              {/* ===== 탭 2: UTM 캠페인 성과 ===== */}
              <TabPanel>
                {loading ? (
                  <LoadingSpinner message="캠페인 데이터 로딩 중..." />
                ) : (
                  <div className="space-y-6 mt-6">
                    <div>
                      <Title>UTM 캠페인 성과 분석</Title>
                      <Text>마케팅 캠페인별 세션, 전환율, ROI를 분석합니다</Text>
                    </div>
                    <Card>
                      <Title>캠페인 데이터</Title>
                      <Text className="mt-4">총 캠페인: {campaigns.length}개</Text>
                      {campaigns.length === 0 && (
                        <Text className="text-gray-500 mt-2">데이터가 없습니다</Text>
                      )}
                    </Card>
                  </div>
                )}
              </TabPanel>

              {/* ===== 탭 3: 시간대별 트래픽 ===== */}
              <TabPanel>
                {loading ? (
                  <LoadingSpinner message="트래픽 데이터 로딩 중..." />
                ) : (
                  <div className="space-y-6 mt-6">
                    <div>
                      <Title>시간대별 트래픽 분석</Title>
                      <Text>시간대 및 요일별 방문 패턴을 분석합니다</Text>
                    </div>
                    <Card>
                      <Title>트래픽 데이터</Title>
                      <Text className="mt-4">시간대별/요일별 데이터</Text>
                      {!timeTraffic && (
                        <Text className="text-gray-500 mt-2">데이터가 없습니다</Text>
                      )}
                    </Card>
                  </div>
                )}
              </TabPanel>

              {/* ===== 탭 4: 랜딩 페이지 분석 ===== */}
              <TabPanel>
                {loading ? (
                  <LoadingSpinner message="랜딩 페이지 데이터 로딩 중..." />
                ) : (
                  <div className="space-y-6 mt-6">
                    <div>
                      <Title>랜딩 페이지 성능 분석</Title>
                      <Text>유입된 랜딩 페이지별 이탈률, 전환율을 분석합니다</Text>
                    </div>
                    <Card>
                      <Title>랜딩 페이지 데이터</Title>
                      <Text className="mt-4">총 랜딩 페이지: {landingPages.length}개</Text>
                      {landingPages.length === 0 && (
                        <Text className="text-gray-500 mt-2">데이터가 없습니다</Text>
                      )}
                    </Card>
                  </div>
                )}
              </TabPanel>

              {/* ===== 탭 5: 이탈 페이지 분석 ===== */}
              <TabPanel>
                {loading ? (
                  <LoadingSpinner message="이탈 페이지 데이터 로딩 중..." />
                ) : (
                  <div className="space-y-6 mt-6">
                    <div>
                      <Title>이탈 페이지 분석</Title>
                      <Text>사용자가 이탈하는 페이지를 파악합니다</Text>
                    </div>
                    <Card>
                      <Title>이탈 페이지 데이터</Title>
                      <Text className="mt-4">총 이탈 페이지: {exitPages.length}개</Text>
                      {exitPages.length === 0 && (
                        <Text className="text-gray-500 mt-2">데이터가 없습니다</Text>
                      )}
                    </Card>
                  </div>
                )}
              </TabPanel>

              {/* ===== 탭 6: 사용자 여정 ===== */}
              <TabPanel>
                {loading ? (
                  <LoadingSpinner message="사용자 여정 데이터 로딩 중..." />
                ) : (
                  <div className="space-y-6 mt-6">
                    <div>
                      <Title>사용자 여정 분석</Title>
                      <Text>전환한 사용자와 이탈한 사용자의 경로를 비교합니다</Text>
                    </div>
                    <Card>
                      <Title>사용자 여정 데이터</Title>
                      <Text className="mt-4">총 여정: {userJourneys.length}개</Text>
                      {userJourneys.length === 0 && (
                        <Text className="text-gray-500 mt-2">데이터가 없습니다</Text>
                      )}
                    </Card>
                  </div>
                )}
              </TabPanel>

              {/* ===== 탭 7: 코호트 & 유지율 ===== */}
              <TabPanel>
                {loading ? (
                  <LoadingSpinner message="코호트 데이터 로딩 중..." />
                ) : (
                  <div className="space-y-6 mt-6">
                    <div>
                      <Title>코호트 & 유지율 분석</Title>
                      <Text>시간별 사용자 그룹의 재방문율을 분석합니다</Text>
                    </div>
                    <Card>
                      <Title>코호트 데이터</Title>
                      <Text className="mt-4">총 코호트: {cohorts.length}개</Text>
                      {cohorts.length === 0 && (
                        <Text className="text-gray-500 mt-2">데이터가 없습니다</Text>
                      )}
                    </Card>
                  </div>
                )}
              </TabPanel>

              {/* ===== 탭 8: 실시간 모니터링 ===== */}
              <TabPanel>
                {loading ? (
                  <LoadingSpinner message="실시간 데이터 로딩 중..." />
                ) : (
                  <div className="space-y-6 mt-6">
                    <Flex justifyContent="between" alignItems="center">
                      <div>
                        <Title>실시간 모니터링</Title>
                        <Text>현재 진행 중인 트래픽 및 사용자 행동을 실시간으로 추적합니다</Text>
                      </div>
                      <Badge color="green" size="lg">
                        Live • 10초마다 자동 갱신
                      </Badge>
                    </Flex>
                    
                    <Grid numItems={1} numItemsSm={2} className="gap-6">
                      <Card>
                        <Text>현재 접속자</Text>
                        <Metric className="text-green-600">{realtimeData?.activeUsers || 0}</Metric>
                      </Card>
                      <Card>
                        <Text>최근 10분 페이지뷰</Text>
                        <Metric>{realtimeData?.recentPageViews.length || 0}</Metric>
                      </Card>
                    </Grid>
                  </div>
                )}
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </Card>
      </div>
    </div>
  );
}
