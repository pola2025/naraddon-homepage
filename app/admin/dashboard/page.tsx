'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';

/**
 * 관리자 대시보드 (컴팩트 요약형)
 *
 * @purpose 핵심 지표를 한 화면에 파악할 수 있는 관리자 대시보드
 * @context 방문자(고유 IP) + 페이지뷰 분리, 전일 대비 증감 표시
 * @decision 나라똔 인터뷰 테이블은 /admin/naraddon-tube로 분리
 */

interface DashboardStats {
  totalUsers: number;
  totalConsultations: number;
  pendingConsultations: number;
  totalExaminers: number;
  totalPolicyNews: number;
  totalTubeVideos: number;
  recentActivities: Activity[];
  pageviews?: {
    today: number;
    yesterday: number;
    thisMonth: number;
    total: number;
  };
  visitors?: {
    today: number;
    yesterday: number;
    thisMonth: number;
    total: number;
  };
  marketingStats?: {
    totalSessions: number;
    avgPageViews: number;
    avgTimeSpent: number;
    bounceRate: number;
  };
}

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user: string;
}

/** 전일 대비 증감 계산 헬퍼 */
function DeltaBadge({ today, yesterday }: { today: number; yesterday: number }) {
  if (yesterday === 0 && today === 0) return null;
  const diff = today - yesterday;
  const pct = yesterday > 0 ? Math.round((diff / yesterday) * 100) : today > 0 ? 100 : 0;

  if (diff === 0) return <span className="text-xs text-gray-400">- 변동 없음</span>;

  const isUp = diff > 0;
  return (
    <span className={`text-xs font-medium ${isUp ? 'text-green-600' : 'text-red-500'}`}>
      {isUp ? '↑' : '↓'} {Math.abs(diff).toLocaleString()} ({isUp ? '+' : ''}
      {pct}%)
    </span>
  );
}

/** 체류시간 포맷 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}초`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}분 ${s}초` : `${m}분`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard stats error:', err);
      setError('대시보드 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="데이터를 불러오는 중..." fullScreen />;

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded m-6">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              마지막 갱신{' '}
              {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={fetchDashboardStats}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            새로고침
          </button>
        </div>
      </div>

      {/* 핵심 지표 (4칸) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 오늘 방문자 */}
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">오늘 방문자</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {stats?.visitors?.today.toLocaleString() || '0'}
          </p>
          <div className="mt-1">
            <DeltaBadge
              today={stats?.visitors?.today || 0}
              yesterday={stats?.visitors?.yesterday || 0}
            />
          </div>
        </div>

        {/* 오늘 페이지뷰 */}
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">오늘 페이지뷰</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {stats?.pageviews?.today.toLocaleString() || '0'}
          </p>
          <div className="mt-1">
            <DeltaBadge
              today={stats?.pageviews?.today || 0}
              yesterday={stats?.pageviews?.yesterday || 0}
            />
          </div>
        </div>

        {/* 대기중 상담 */}
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">대기중 상담</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-3xl font-bold text-gray-900">
              {stats?.pendingConsultations.toLocaleString() || '0'}
            </p>
            {(stats?.pendingConsultations || 0) > 0 && (
              <span className="inline-flex items-center justify-center w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            전체 {stats?.totalConsultations.toLocaleString() || '0'}건
          </p>
        </div>

        {/* 전체 사용자 */}
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">전체 사용자</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {stats?.totalUsers.toLocaleString() || '0'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            심사관 {stats?.totalExaminers.toLocaleString() || '0'}명
          </p>
        </div>
      </div>

      {/* 트래픽 요약 (미니 지표 4칸) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">이번 달 방문자</p>
          <p className="text-lg font-semibold text-gray-800">
            {stats?.visitors?.thisMonth.toLocaleString() || '0'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">이번 달 페이지뷰</p>
          <p className="text-lg font-semibold text-gray-800">
            {stats?.pageviews?.thisMonth.toLocaleString() || '0'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">평균 체류시간</p>
          <p className="text-lg font-semibold text-gray-800">
            {formatDuration(stats?.marketingStats?.avgTimeSpent || 0)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">이탈률</p>
          <p className="text-lg font-semibold text-gray-800">
            {stats?.marketingStats?.bounceRate.toFixed(1) || '0'}%
          </p>
        </div>
      </div>

      {/* 마케팅 통계 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">마케팅 통계</h2>
          <Link
            href="/admin/analytics"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            상세 통계 보기 →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
          <div className="px-6 py-5 text-center">
            <p className="text-xs font-medium text-gray-500">총 세션</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {stats?.marketingStats?.totalSessions.toLocaleString() || '0'}
            </p>
          </div>
          <div className="px-6 py-5 text-center">
            <p className="text-xs font-medium text-gray-500">평균 페이지뷰</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {stats?.marketingStats?.avgPageViews.toFixed(1) || '0'}
            </p>
          </div>
          <div className="px-6 py-5 text-center">
            <p className="text-xs font-medium text-gray-500">평균 체류시간</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatDuration(stats?.marketingStats?.avgTimeSpent || 0)}
            </p>
          </div>
          <div className="px-6 py-5 text-center">
            <p className="text-xs font-medium text-gray-500">이탈률</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {stats?.marketingStats?.bounceRate.toFixed(1) || '0'}%
            </p>
          </div>
        </div>
      </div>

      {/* 빠른 메뉴 + 최근 활동 (2컬럼) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 빠른 메뉴 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">빠른 메뉴</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  href: '/admin/users',
                  label: '사용자 관리',
                  icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
                },
                {
                  href: '/admin/examiners',
                  label: '심사관 관리',
                  icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
                },
                {
                  href: '/admin/expert-dashboards',
                  label: '전문가 대시보드',
                  icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
                },
                {
                  href: '/admin/consultations',
                  label: '상담 관리',
                  icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
                },
                {
                  href: '/admin/naraddon-tube',
                  label: '나라똔 인터뷰',
                  icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
                },
                {
                  href: '/admin/shorts',
                  label: '쇼츠 관리',
                  icon: 'M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z',
                },
                {
                  href: '/business-voice/admin',
                  label: '똔톡 관리',
                  icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
                },
                {
                  href: '/policy-news/admin',
                  label: '정책 소식',
                  icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z',
                },
                {
                  href: '/admin/policy-analysis',
                  label: '정책 분석',
                  icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
                },
              ].map((menu) => (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors"
                >
                  <svg
                    className="h-5 w-5 text-gray-400 mr-2.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={menu.icon}
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-900">{menu.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* 최근 활동 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">최근 활동</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start">
                    <div className="flex-shrink-0">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          activity.type === 'consultation' ? 'bg-blue-100' : 'bg-green-100'
                        }`}
                      >
                        <svg
                          className={`h-4 w-4 ${
                            activity.type === 'consultation' ? 'text-blue-600' : 'text-green-600'
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={
                              activity.type === 'consultation'
                                ? 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z'
                                : 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                            }
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.user} · {activity.timestamp}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">최근 활동이 없습니다</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
