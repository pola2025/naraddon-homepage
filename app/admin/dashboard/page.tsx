'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TubeVideo {
  _id: string;
  videos: Array<{
    title: string;
    youtubeId: string;
  }>;
  isPublished: boolean;
  sortOrder: number;
  createdAt?: string;
}

interface DashboardStats {
  totalUsers: number;
  totalConsultations: number;
  pendingConsultations: number;
  totalExaminers: number;
  totalPolicyNews: number;
  totalTubeVideos: number;
  recentActivities: Activity[];
  visits?: {
    today: number;
    yesterday: number;
    thisMonth: number;
    total: number;
  };
  deviceStats?: {
    mobile: number;
    desktop: number;
    tablet: number;
    unknown: number;
  };
  trafficSourceStats?: {
    direct: number;
    search: number;
    social: number;
    other: number;
  };
  topReferrers?: Array<{
    domain: string;
    count: number;
  }>;
  topPages?: Array<{
    pathname: string;
    count: number;
  }>;
  marketingStats?: {
    totalSessions: number;
    avgPageViews: number;
    avgTimeSpent: number;
    bounceRate: number;
  };
  umami?: {
    pageviews: number;
    visitors: number;
    visits: number;
    bounceRate: number;
    avgSessionTime: number;
  };
  googleSearch?: {
    totalClicks: number;
    totalImpressions: number;
    avgCTR: string;
    avgPosition: string;
    topQueries: Array<{
      query: string;
      clicks: number;
      impressions: number;
      ctr: string;
      position: string;
    }>;
  };
}

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 나라똔튜브 관리
  const [tubeVideos, setTubeVideos] = useState<TubeVideo[]>([]);
  const [tubeLoading, setTubeLoading] = useState(false);
  const [tubeError, setTubeError] = useState('');
  const [updatingVideoId, setUpdatingVideoId] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
    fetchTubeVideos();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/stats');

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      setError('대시보드 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTubeVideos = async () => {
    try {
      setTubeLoading(true);
      setTubeError('');
      const response = await fetch('/api/naraddon-tube?includeDraft=true');

      if (!response.ok) {
        throw new Error('Failed to fetch tube videos');
      }

      const data = await response.json();
      if (data.entries && Array.isArray(data.entries)) {
        setTubeVideos(data.entries);
      }
    } catch (error) {
      console.error('Tube videos error:', error);
      setTubeError('나라똔튜브 데이터를 불러오는데 실패했습니다.');
    } finally {
      setTubeLoading(false);
    }
  };

  const handleTogglePublish = async (videoId: string, currentStatus: boolean) => {
    try {
      setUpdatingVideoId(videoId);
      const video = tubeVideos.find(v => v._id === videoId);
      if (!video) return;

      const response = await fetch('/api/naraddon-tube/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: videoId,
          isPublished: !currentStatus,
          title: video.videos[0]?.title,
          youtubeUrl: video.videos[0]?.youtubeId,
          sortOrder: video.sortOrder,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update video');
      }

      // 로컬 상태 업데이트
      setTubeVideos(prev =>
        prev.map(v =>
          v._id === videoId ? { ...v, isPublished: !currentStatus } : v
        )
      );
    } catch (error) {
      console.error('Toggle publish error:', error);
      alert('공개 상태 변경에 실패했습니다.');
    } finally {
      setUpdatingVideoId(null);
    }
  };

  const handleUpdateSortOrder = async (videoId: string, newSortOrder: number) => {
    try {
      setUpdatingVideoId(videoId);
      const video = tubeVideos.find(v => v._id === videoId);
      if (!video) return;

      const response = await fetch('/api/naraddon-tube/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: videoId,
          isPublished: video.isPublished,
          title: video.videos[0]?.title,
          youtubeUrl: video.videos[0]?.youtubeId,
          sortOrder: newSortOrder,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update sort order');
      }

      // 로컬 상태 업데이트
      setTubeVideos(prev =>
        prev.map(v =>
          v._id === videoId ? { ...v, sortOrder: newSortOrder } : v
        ).sort((a, b) => a.sortOrder - b.sortOrder)
      );
    } catch (error) {
      console.error('Update sort order error:', error);
      alert('순서 변경에 실패했습니다.');
    } finally {
      setUpdatingVideoId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 대시보드 전용 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-900">관리자 대시보드</h1>
          <p className="mt-1 text-sm text-gray-500">시스템 전체 현황을 확인하고 관리합니다</p>
        </div>
      </header>

      {loading ? (
            <LoadingSpinner message="데이터를 불러오는 중..." fullScreen />
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : (
            <>
              {/* 통계 목록 */}
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-700">전체 사용자</span>
                    <span className="text-xl font-semibold text-gray-900">{stats?.totalUsers.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-700">전체 상담</span>
                    <span className="text-xl font-semibold text-gray-900">{stats?.totalConsultations.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-700">대기중 상담</span>
                    <span className="text-xl font-semibold text-gray-900">{stats?.pendingConsultations.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700">심사관</span>
                    <span className="text-xl font-semibold text-gray-900">{stats?.totalExaminers.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* 방문 통계 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-teal-500 rounded-md p-3">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    </div>
                    <div className="ml-5">
                      <p className="text-sm font-medium text-gray-500">오늘 방문</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {stats?.visits?.today.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-orange-500 rounded-md p-3">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="ml-5">
                      <p className="text-sm font-medium text-gray-500">어제 방문</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {stats?.visits?.yesterday.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-cyan-500 rounded-md p-3">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div className="ml-5">
                      <p className="text-sm font-medium text-gray-500">이번 달 방문</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {stats?.visits?.thisMonth.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-pink-500 rounded-md p-3">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                    <div className="ml-5">
                      <p className="text-sm font-medium text-gray-500">전체 방문</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {stats?.visits?.total.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 추가 통계 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                        />
                      </svg>
                    </div>
                    <div className="ml-5">
                      <p className="text-sm font-medium text-gray-500">정책 소식</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {stats?.totalPolicyNews.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div className="ml-5">
                      <p className="text-sm font-medium text-gray-500">나라돈 튜브 영상</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {stats?.totalTubeVideos.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 마케팅 통계 */}
              <div className="bg-white rounded-lg shadow mb-8">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">마케팅 통계</h2>
                  <p className="text-sm text-gray-500 mt-1">방문자 행동 분석 및 인게이지먼트 지표</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3">
                      <svg
                        className="h-6 w-6 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-500">총 세션</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">
                      {stats?.marketingStats?.totalSessions.toLocaleString() || '0'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">고유 방문 세션 수</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-3">
                      <svg
                        className="h-6 w-6 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-500">평균 페이지뷰</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">
                      {stats?.marketingStats?.avgPageViews.toFixed(1) || '0'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">세션당 평균 페이지</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-3">
                      <svg
                        className="h-6 w-6 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-500">평균 체류시간</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">
                      {(() => {
                        const seconds = stats?.marketingStats?.avgTimeSpent || 0;
                        if (seconds < 60) {
                          return `${seconds}초`;
                        }
                        const minutes = Math.floor(seconds / 60);
                        const remainingSeconds = seconds % 60;
                        return `${minutes}분 ${remainingSeconds}초`;
                      })()}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">세션당 평균 시간</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mx-auto mb-3">
                      <svg
                        className="h-6 w-6 text-orange-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-500">이탈률</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">
                      {stats?.marketingStats?.bounceRate.toFixed(1) || '0'}%
                    </p>
                    <p className="text-xs text-gray-400 mt-1">1페이지만 본 비율</p>
                  </div>
                </div>
              </div>

              {/* 방문 분석 차트 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* 디바이스 타입 분석 */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">디바이스 타입</h2>
                  </div>
                  <div className="p-6">
                    {stats?.deviceStats && (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: '모바일', value: stats.deviceStats.mobile, color: '#3B82F6' },
                              { name: '데스크톱', value: stats.deviceStats.desktop, color: '#10B981' },
                              { name: '태블릿', value: stats.deviceStats.tablet, color: '#F59E0B' },
                              { name: '알 수 없음', value: stats.deviceStats.unknown, color: '#6B7280' },
                            ].filter(item => item.value > 0)}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={(entry) => `${entry.name}: ${entry.value}회`}
                          >
                            {[
                              { name: '모바일', value: stats.deviceStats.mobile, color: '#3B82F6' },
                              { name: '데스크톱', value: stats.deviceStats.desktop, color: '#10B981' },
                              { name: '태블릿', value: stats.deviceStats.tablet, color: '#F59E0B' },
                              { name: '알 수 없음', value: stats.deviceStats.unknown, color: '#6B7280' },
                            ].filter(item => item.value > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* 유입 타입 분석 */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">유입 타입</h2>
                  </div>
                  <div className="p-6">
                    {stats?.trafficSourceStats && (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: '직접 유입', value: stats.trafficSourceStats.direct, color: '#8B5CF6' },
                              { name: '검색 엔진', value: stats.trafficSourceStats.search, color: '#EC4899' },
                              { name: 'SNS', value: stats.trafficSourceStats.social, color: '#F59E0B' },
                              { name: '기타', value: stats.trafficSourceStats.other, color: '#6B7280' },
                            ].filter(item => item.value > 0)}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={(entry) => `${entry.name}: ${entry.value}회`}
                          >
                            {[
                              { name: '직접 유입', value: stats.trafficSourceStats.direct, color: '#8B5CF6' },
                              { name: '검색 엔진', value: stats.trafficSourceStats.search, color: '#EC4899' },
                              { name: 'SNS', value: stats.trafficSourceStats.social, color: '#F59E0B' },
                              { name: '기타', value: stats.trafficSourceStats.other, color: '#6B7280' },
                            ].filter(item => item.value > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              {/* 분석 차트 그리드 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* 상세 유입 경로 */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">상세 유입 경로 (상위 10개)</h2>
                    <p className="text-sm text-gray-500 mt-1">검색 엔진, SNS, 블로그 등 외부 유입 도메인</p>
                  </div>
                  <div className="p-6">
                    {stats?.topReferrers && stats.topReferrers.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart
                          data={stats.topReferrers}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="domain" type="category" width={110} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill="#8B5CF6" name="방문 횟수" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[400px] text-gray-500">
                        외부 유입 경로 데이터가 없습니다
                      </div>
                    )}
                  </div>
                </div>

                {/* 인기 페이지 */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">인기 페이지 (상위 10개)</h2>
                    <p className="text-sm text-gray-500 mt-1">가장 많이 방문된 페이지</p>
                  </div>
                  <div className="p-6">
                    {stats?.topPages && stats.topPages.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart
                          data={stats.topPages}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="pathname" type="category" width={110} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill="#10B981" name="페이지뷰" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[400px] text-gray-500">
                        페이지뷰 데이터가 없습니다
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Google Search Console 통계 */}
              {stats?.googleSearch && (
                <div className="bg-white rounded-lg shadow mb-8">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Google 검색 성능 (최근 28일)</h2>
                    <p className="text-sm text-gray-500 mt-1">Google 검색 결과에서의 사이트 성능</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3">
                        <svg
                          className="h-6 w-6 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                          />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-500">총 클릭 수</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">
                        {stats.googleSearch.totalClicks.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">검색 결과 클릭</p>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-3">
                        <svg
                          className="h-6 w-6 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-500">총 노출 수</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">
                        {stats.googleSearch.totalImpressions.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">검색 결과 노출</p>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-3">
                        <svg
                          className="h-6 w-6 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                          />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-500">평균 CTR</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">
                        {stats.googleSearch.avgCTR}%
                      </p>
                      <p className="text-xs text-gray-400 mt-1">클릭률</p>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mx-auto mb-3">
                        <svg
                          className="h-6 w-6 text-orange-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
                          />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-500">평균 순위</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">
                        {stats.googleSearch.avgPosition}위
                      </p>
                      <p className="text-xs text-gray-400 mt-1">검색 결과 위치</p>
                    </div>
                  </div>

                  {/* 상위 검색어 목록 */}
                  {stats.googleSearch.topQueries.length > 0 && (
                    <div className="px-6 pb-6">
                      <h3 className="text-md font-semibold text-gray-900 mb-4">상위 검색어 (Top 10)</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">순위</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">검색어</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">클릭 수</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">노출 수</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">CTR</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">평균 순위</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {stats.googleSearch.topQueries.map((query, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {index + 1}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {query.query}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                                  {query.clicks.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-500">
                                  {query.impressions.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-500">
                                  {query.ctr}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-500">
                                  {query.position}위
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 나라똔튜브 관리 */}
              <div className="bg-white rounded-lg shadow mb-8">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">나라똔튜브 관리</h2>
                    <p className="text-sm text-gray-500 mt-1">영상 공개 상태 및 노출 순서를 관리합니다</p>
                  </div>
                  <Link
                    href="/admin/naraddon-tube"
                    className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-md hover:bg-blue-50"
                  >
                    전체 관리
                  </Link>
                </div>
                <div className="p-6">
                  {tubeLoading ? (
                    <div className="text-center py-8 text-gray-500">로딩 중...</div>
                  ) : tubeError ? (
                    <div className="text-center py-8 text-red-500">{tubeError}</div>
                  ) : tubeVideos.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">등록된 영상이 없습니다</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">위치</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">제목</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">YouTube ID</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">순서</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">공개</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {tubeVideos
                            .sort((a, b) => a.sortOrder - b.sortOrder)
                            .map((video, index) => (
                            <tr key={video._id} className={updatingVideoId === video._id ? 'opacity-50' : ''}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {index + 1}번
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {video.videos[0]?.title || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {video.videos[0]?.youtubeId || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <input
                                  type="number"
                                  value={video.sortOrder}
                                  onChange={(e) => handleUpdateSortOrder(video._id, Number(e.target.value))}
                                  disabled={updatingVideoId === video._id}
                                  className="w-20 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                  min="0"
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <button
                                  onClick={() => handleTogglePublish(video._id, video.isPublished)}
                                  disabled={updatingVideoId === video._id}
                                  className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full transition-colors disabled:opacity-50 ${
                                    video.isPublished
                                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                  }`}
                                >
                                  {video.isPublished ? '공개' : '비공개'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* 빠른 메뉴 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">빠른 메뉴</h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4">
                      <Link
                        href="/admin/users"
                        className="flex items-center p-3 rounded-lg hover:bg-gray-50 border border-gray-200"
                      >
                        <svg
                          className="h-6 w-6 text-gray-400 mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">사용자 관리</span>
                      </Link>

                      <Link
                        href="/admin/examiners"
                        className="flex items-center p-3 rounded-lg hover:bg-gray-50 border border-gray-200"
                      >
                        <svg
                          className="h-6 w-6 text-gray-400 mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                          />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">심사관 관리</span>
                      </Link>

                      <Link
                        href="/admin/consultations"
                        className="flex items-center p-3 rounded-lg hover:bg-gray-50 border border-gray-200"
                      >
                        <svg
                          className="h-6 w-6 text-gray-400 mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">상담 관리</span>
                      </Link>

                      <Link
                        href="/admin/naraddon-tube"
                        className="flex items-center p-3 rounded-lg hover:bg-gray-50 border border-gray-200"
                      >
                        <svg
                          className="h-6 w-6 text-gray-400 mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">나라똔튜브</span>
                      </Link>

                      <Link
                        href="/business-voice/admin"
                        className="flex items-center p-3 rounded-lg hover:bg-gray-50 border border-gray-200"
                      >
                        <svg
                          className="h-6 w-6 text-gray-400 mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">똔톡 관리</span>
                      </Link>

                      <Link
                        href="/admin/logs"
                        className="flex items-center p-3 rounded-lg hover:bg-gray-50 border border-gray-200"
                      >
                        <svg
                          className="h-6 w-6 text-gray-400 mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">활동 로그</span>
                      </Link>

                      <Link
                        href="/policy-news/admin"
                        className="flex items-center p-3 rounded-lg hover:bg-gray-50 border border-gray-200"
                      >
                        <svg
                          className="h-6 w-6 text-gray-400 mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                          />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">정책 소식</span>
                      </Link>

                      <Link
                        href="/admin/policy-analysis"
                        className="flex items-center p-3 rounded-lg hover:bg-gray-50 border border-gray-200"
                      >
                        <svg
                          className="h-6 w-6 text-gray-400 mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">정책 분석</span>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* 최근 활동 */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">최근 활동</h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {stats?.recentActivities.map((activity) => (
                        <div key={activity.id} className="flex items-start">
                          <div className="flex-shrink-0">
                            {activity.type === 'consultation' ? (
                              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <svg
                                  className="h-4 w-4 text-blue-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                                  />
                                </svg>
                              </div>
                            ) : (
                              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                                <svg
                                  className="h-4 w-4 text-green-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {activity.description}
                            </p>
                            <p className="text-xs text-gray-500">
                              {activity.user} • {activity.timestamp}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
    </div>
  );
}
