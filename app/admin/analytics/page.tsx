'use client';

import { useState, useEffect } from 'react';
import { Card, Title, Text, BarList, Metric, Flex, Badge, Grid, Select, SelectItem } from '@tremor/react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/**
 * 관리자 분석 대시보드
 *
 * @purpose 전환 퍼널, 캠페인 성과, 사용자 여정 등 종합 마케팅 분석
 * @context Tremor 라이브러리를 사용한 고급 시각화
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

export default function AdminAnalyticsPage() {
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [selectedFunnel, setSelectedFunnel] = useState('consultation');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFunnelData();
  }, [selectedFunnel]);

  const fetchFunnelData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/funnel?type=${selectedFunnel}`);
      const data = await response.json();

      if (data.success) {
        setFunnelData(data.funnel);
      }
    } catch (error) {
      console.error('Failed to fetch funnel data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="분석 데이터를 불러오는 중..." fullScreen />;
  }

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
          <h1 className="text-2xl font-semibold text-gray-900">분석 대시보드</h1>
          <p className="mt-1 text-sm text-gray-500">전환 퍼널 및 마케팅 성과 분석</p>
        </div>
      </header>

      <div className="px-6 space-y-6">
        {/* 퍼널 선택 */}
        <Card>
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
        </Card>

        {/* 전체 전환율 */}
        <Grid numItems={1} numItemsSm={3} className="gap-6">
          <Card>
            <Text>전체 전환율</Text>
            <Metric>{funnelData?.totalConversionRate.toFixed(2)}%</Metric>
            <Flex className="mt-4">
              <Text>
                <Badge color="blue">
                  {funnelData?.steps[0]?.count.toLocaleString()} 시작
                </Badge>
              </Text>
              <Text>
                <Badge color="green">
                  {funnelData?.steps[funnelData.steps.length - 1]?.count.toLocaleString()} 완료
                </Badge>
              </Text>
            </Flex>
          </Card>

          <Card>
            <Text>최대 이탈 단계</Text>
            <Metric>
              {funnelData?.steps.reduce((max, step) =>
                step.dropOffRate > max.dropOffRate ? step : max
              , funnelData.steps[0])?.name || '-'}
            </Metric>
            <Flex className="mt-4">
              <Badge color="red">
                {funnelData?.steps.reduce((max, step) =>
                  step.dropOffRate > max.dropOffRate ? step : max
                , funnelData.steps[0])?.dropOffRate.toFixed(1)}% 이탈
              </Badge>
            </Flex>
          </Card>

          <Card>
            <Text>평균 단계별 전환율</Text>
            <Metric>
              {funnelData?.steps.length
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
              {funnelData?.steps.map((step, index) => (
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
                {funnelData?.steps.map((step, index) => {
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
            {funnelData?.steps.map((step, index) => {
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
    </div>
  );
}
