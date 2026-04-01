'use client';

import { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/**
 * 관리자 상세 분석 대시보드
 *
 * @purpose 심층 분석 및 인사이트 제공
 * @context 기본 대시보드에서 이동하여 상세 통계 확인
 * @features
 * - 디바이스 타입 분석 (도넛 차트)
 * - 유입 타입 분석 (도넛 차트)
 * - 상세 유입 경로 Top 10
 * - 인기 페이지 Top 10
 * - Google 검색 성능 상세
 * - 기준 기간 표시
 */

// 차트 색상
const DEVICE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899']; // blue, purple, pink
const TRAFFIC_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6b7280']; // green, amber, red, gray

interface Stats {
  visits: {
    today: number;
    yesterday: number;
    thisMonth: number;
    total: number;
  };
  marketingStats: {
    totalSessions: number;
    avgPageViews: number;
    avgTimeSpent: number;
    bounceRate: number;
  };
  deviceStats: {
    mobile: number;
    desktop: number;
    tablet: number;
    unknown?: number;
  };
  trafficSourceStats: {
    direct: number;
    search: number;
    social: number;
    other: number;
  };
  topReferrers: Array<{
    domain: string;
    visits: number;
  }>;
  topPages: Array<{
    pathname: string;
    views: number;
  }>;
  period: {
    startDate: string;
    endDate: string;
  };
}

/**
 * 커스텀 툴팁 컴포넌트
 * @purpose 차트 호버 시 상세 정보 표시
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
        <p className="font-semibold text-gray-900">{payload[0].name}</p>
        <p className="text-sm text-gray-600">
          {payload[0].value.toLocaleString()}회 (
          {((payload[0].value / payload[0].payload.total) * 100).toFixed(1)}%)
        </p>
      </div>
    );
  }
  return null;
};

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'custom'>('7d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    // custom 모드가 아닐 때만 자동 로드
    if (dateRange !== 'custom') {
      loadData();
    }
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 날짜 범위 계산
      let endDate = new Date();
      let startDate = new Date();

      if (dateRange === 'custom') {
        // 커스텀 날짜 사용
        if (!customStartDate || !customEndDate) {
          setError('시작일과 종료일을 모두 선택해주세요');
          setLoading(false);
          return;
        }
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
      } else {
        // 기존 프리셋 날짜 범위
        switch (dateRange) {
          case '7d':
            startDate.setDate(endDate.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(endDate.getDate() - 30);
            break;
          case '90d':
            startDate.setDate(endDate.getDate() - 90);
            break;
        }
      }

      const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0];
      };

      const response = await fetch(
        `/api/admin/stats?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`
      );

      if (!response.ok) {
        throw new Error('데이터를 불러오는데 실패했습니다');
      }
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="상세 통계를 불러오는 중..." fullScreen />;
  }

  if (error || !stats) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || '데이터를 불러올 수 없습니다'}
        </div>
      </div>
    );
  }

  // 디바이스 타입 차트 데이터
  const deviceData = [
    { name: '모바일', value: stats.deviceStats.mobile },
    { name: '데스크톱', value: stats.deviceStats.desktop },
    { name: '태블릿', value: stats.deviceStats.tablet },
  ].map((item) => ({
    ...item,
    total: stats.deviceStats.mobile + stats.deviceStats.desktop + stats.deviceStats.tablet,
  }));

  // 유입 타입 차트 데이터
  const trafficData = [
    { name: '직접 방문', value: stats.trafficSourceStats.direct },
    { name: '검색', value: stats.trafficSourceStats.search },
    { name: 'SNS', value: stats.trafficSourceStats.social },
    { name: '기타', value: stats.trafficSourceStats.other },
  ].map((item) => ({
    ...item,
    total:
      stats.trafficSourceStats.direct +
      stats.trafficSourceStats.search +
      stats.trafficSourceStats.social +
      stats.trafficSourceStats.other,
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">상세 통계 분석</h1>
              <p className="mt-1 text-sm text-gray-500">
                심층 분석 및 인사이트 · 기준 기간: {stats.period?.startDate || '최근 7일'} ~{' '}
                {stats.period?.endDate || '오늘'}
              </p>
            </div>

            {/* 날짜 범위 선택 */}
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm font-medium text-gray-700">기간:</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d' | 'custom')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">최근 7일</option>
                <option value="30d">최근 30일</option>
                <option value="90d">최근 90일</option>
                <option value="custom">직접 선택</option>
              </select>

              {/* 커스텀 날짜 선택 */}
              {dateRange === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-500">~</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={loadData}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    조회
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 space-y-8">
        {/* 디바이스 타입 & 유입 타입 분석 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 디바이스 타입 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">디바이스 타입 분석</h2>
              <p className="text-sm text-gray-500 mt-1">
                📅 기준: {stats.period?.startDate || '최근 7일'} ~ {stats.period?.endDate || '오늘'}
              </p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${value.toLocaleString()}회`}
                    labelLine={{ stroke: '#666', strokeWidth: 1 }}
                  >
                    {deviceData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={DEVICE_COLORS[index % DEVICE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={60}
                    content={(props: any) => {
                      const { payload } = props;
                      return (
                        <div className="flex justify-center gap-6 mt-4">
                          {payload.map((entry: any, index: number) => (
                            <div key={`legend-${index}`} className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-sm text-gray-700">
                                {entry.value}:{' '}
                                <span className="font-semibold">
                                  {deviceData[index].value.toLocaleString()}회
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 유입 타입 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">유입 타입 분석</h2>
              <p className="text-sm text-gray-500 mt-1">
                📅 기준: {stats.period?.startDate || '최근 7일'} ~ {stats.period?.endDate || '오늘'}
              </p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={trafficData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${value.toLocaleString()}회`}
                    labelLine={{ stroke: '#666', strokeWidth: 1 }}
                  >
                    {trafficData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={TRAFFIC_COLORS[index % TRAFFIC_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={60}
                    content={(props: any) => {
                      const { payload } = props;
                      return (
                        <div className="flex justify-center gap-4 mt-4 flex-wrap">
                          {payload.map((entry: any, index: number) => (
                            <div key={`legend-${index}`} className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-sm text-gray-700">
                                {entry.value}:{' '}
                                <span className="font-semibold">
                                  {trafficData[index].value.toLocaleString()}회
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 상위 유입 경로 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">상위 유입 경로 (Top 10)</h2>
            <p className="text-sm text-gray-500 mt-1">
              📅 기준: {stats.period?.startDate || '최근 7일'} ~ {stats.period?.endDate || '오늘'}
            </p>
          </div>
          <div className="p-6">
            {stats.topReferrers && stats.topReferrers.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={stats.topReferrers.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="domain" type="category" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: any) => [`${value.toLocaleString()}회`, '방문']} />
                  <Bar dataKey="visits" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">유입 경로 데이터가 없습니다</div>
            )}
          </div>
        </div>

        {/* 인기 페이지 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">인기 페이지 (Top 10)</h2>
            <p className="text-sm text-gray-500 mt-1">
              📅 기준: {stats.period?.startDate || '최근 7일'} ~ {stats.period?.endDate || '오늘'}
            </p>
          </div>
          <div className="p-6">
            {stats.topPages && stats.topPages.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={stats.topPages.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="pathname" type="category" width={200} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: any) => [`${value.toLocaleString()}회`, '조회']} />
                  <Bar dataKey="views" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">페이지 조회 데이터가 없습니다</div>
            )}
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <svg
              className="h-6 w-6 text-blue-600 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-blue-900">추가 예정 기능</h3>
              <p className="text-sm text-blue-700 mt-1">
                실시간 접속자, 전환 퍼널, 사용자 여정 맵, 코호트 분석 등 고급 분석 기능은 데이터가
                충분히 누적된 후 단계적으로 추가될 예정입니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
