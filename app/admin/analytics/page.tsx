'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
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
  marketing: {
    totalSessions: number;
    avgPageviews: number;
    avgTimeSpent: number;
    bounceRate: number;
  };
  devices: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  traffic: {
    direct: number;
    search: number;
    social: number;
    referral: number;
  };
  referrers: Array<{
    domain: string;
    visits: number;
  }>;
  pages: Array<{
    pathname: string;
    views: number;
  }>;
  googleSearch: {
    totalClicks: number;
    totalImpressions: number;
    avgCTR: number;
    avgPosition: number;
    topQueries: Array<{
      query: string;
      clicks: number;
      impressions: number;
      ctr: string;
      position: string;
    }>;
  };
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
          {payload[0].value.toLocaleString()}회 ({((payload[0].value / payload[0].payload.total) * 100).toFixed(1)}%)
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/stats');
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
    { name: '모바일', value: stats.devices.mobile },
    { name: '데스크톱', value: stats.devices.desktop },
    { name: '태블릿', value: stats.devices.tablet },
  ].map(item => ({
    ...item,
    total: stats.devices.mobile + stats.devices.desktop + stats.devices.tablet
  }));

  // 유입 타입 차트 데이터
  const trafficData = [
    { name: '직접 방문', value: stats.traffic.direct },
    { name: '검색', value: stats.traffic.search },
    { name: 'SNS', value: stats.traffic.social },
    { name: '기타', value: stats.traffic.referral },
  ].map(item => ({
    ...item,
    total: stats.traffic.direct + stats.traffic.search + stats.traffic.social + stats.traffic.referral
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-900">상세 통계 분석</h1>
          <p className="mt-1 text-sm text-gray-500">
            심층 분석 및 인사이트 · 기준 기간: {stats.period?.startDate || '최근 7일'} ~ {stats.period?.endDate || '오늘'}
          </p>
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
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={DEVICE_COLORS[index % DEVICE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry: any) => `${value}: ${entry.payload.value.toLocaleString()}회`}
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
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={trafficData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {trafficData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={TRAFFIC_COLORS[index % TRAFFIC_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry: any) => `${value}: ${entry.payload.value.toLocaleString()}회`}
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
            {stats.referrers && stats.referrers.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={stats.referrers.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="domain"
                    type="category"
                    width={150}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: any) => [`${value.toLocaleString()}회`, '방문']}
                  />
                  <Bar dataKey="visits" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                유입 경로 데이터가 없습니다
              </div>
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
            {stats.pages && stats.pages.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={stats.pages.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="pathname"
                    type="category"
                    width={200}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: any) => [`${value.toLocaleString()}회`, '조회']}
                  />
                  <Bar dataKey="views" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                페이지 조회 데이터가 없습니다
              </div>
            )}
          </div>
        </div>

        {/* Google 검색 성능 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Google 검색 성능</h2>
            <p className="text-sm text-gray-500 mt-1">
              📅 기준: {stats.period?.startDate || '최근 7일'} ~ {stats.period?.endDate || '오늘'}
            </p>
          </div>

          {/* 주요 지표 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-900">총 클릭</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.googleSearch?.totalClicks.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-900">총 노출</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.googleSearch?.totalImpressions.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-900">평균 CTR</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.googleSearch?.avgCTR || '0'}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="h-8 w-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-medium text-amber-900">평균 순위</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {stats.googleSearch?.avgPosition || '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 상위 검색어 테이블 */}
          <div className="px-6 pb-6">
            <h3 className="text-md font-semibold text-gray-900 mb-4">상위 검색어 (Top 10)</h3>
            {stats.googleSearch?.topQueries && stats.googleSearch.topQueries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        검색어
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        클릭
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        노출
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CTR
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        평균 순위
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.googleSearch.topQueries.slice(0, 10).map((query, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {query.query}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {query.clicks.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {query.impressions.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {query.ctr}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {query.position}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                검색 데이터가 없습니다
              </div>
            )}
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <svg className="h-6 w-6 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-blue-900">추가 예정 기능</h3>
              <p className="text-sm text-blue-700 mt-1">
                실시간 접속자, 전환 퍼널, 사용자 여정 맵, 코호트 분석 등 고급 분석 기능은 데이터가 충분히 누적된 후 단계적으로 추가될 예정입니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
