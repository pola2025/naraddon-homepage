'use client';

import Link from 'next/link';

/**
 * 관리자 분석 페이지 (예정)
 *
 * @purpose 향후 관리자 분석/통계 기능 추가 예정
 * @note 현재는 404 에러 방지용 placeholder 페이지
 */
export default function AdminAnalyticsPage() {
  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">분석</h1>
        <p className="mt-2 text-gray-600">
          관리자 분석 기능은 현재 준비 중입니다.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
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
        <h3 className="mt-4 text-lg font-medium text-gray-900">준비 중입니다</h3>
        <p className="mt-2 text-sm text-gray-500">
          이 기능은 곧 추가될 예정입니다.
        </p>
        <div className="mt-6">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            대시보드로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
