'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import {
  UserIcon,
  EyeIcon,
  DocumentTextIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

interface AdminDashboardProps {
  onLogout: () => void;
}

interface StatsCard {
  title: string;
  value: string | number;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [stats, setStats] = useState<StatsCard[]>([
    {
      title: '총 사용자',
      value: '1,234',
      change: 12,
      icon: UserIcon,
      color: 'bg-blue-500'
    },
    {
      title: '오늘 방문자',
      value: '432',
      change: -5,
      icon: EyeIcon,
      color: 'bg-green-500'
    },
    {
      title: '신규 콘텐츠',
      value: '18',
      change: 25,
      icon: DocumentTextIcon,
      color: 'bg-purple-500'
    },
    {
      title: '이번 달 활동',
      value: '892',
      change: 8,
      icon: CalendarIcon,
      color: 'bg-orange-500'
    }
  ]);

  const quickActions = [
    { name: '새 영상 등록', href: '/admin/naraddon-tube' },
    { name: '정책소식 작성', href: '/policy-news/write' },
    { name: '사용자 검색', href: '/admin/users' },
    { name: '백업 실행', href: '/admin/settings/backup' }
  ];

  const recentActivities = [
    { id: 1, type: '영상', action: '새 영상 업로드', time: '5분 전', user: '관리자' },
    { id: 2, type: '정책', action: '정책소식 수정', time: '15분 전', user: '관리자' },
    { id: 3, type: '사용자', action: '신규 가입', time: '1시간 전', user: '김철수' },
    { id: 4, type: '전문가', action: '프로필 업데이트', time: '2시간 전', user: '이영희' },
    { id: 5, type: '비즈니스', action: '인터뷰 게시', time: '3시간 전', user: '관리자' }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar onLogout={onLogout} />

      <div className="flex-1 flex flex-col">
        <AdminHeader />

        <main className="flex-1 p-6 overflow-auto">
          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    <div className="flex items-center mt-2">
                      {stat.change > 0 ? (
                        <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <ArrowTrendingDownIcon className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm ${stat.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {Math.abs(stat.change)}%
                      </span>
                    </div>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 빠른 작업 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">빠른 작업</h3>
                <div className="space-y-2">
                  {quickActions.map((action) => (
                    <Link
                      key={action.name}
                      href={action.href}
                      className="block px-4 py-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-700">{action.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* 최근 활동 */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 활동</h3>
                <div className="space-y-3">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex items-center">
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded">
                          {activity.type}
                        </span>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                          <p className="text-xs text-gray-500">{activity.user}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 섹션별 현황 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">나라똔 인터뷰</h4>
              <p className="text-2xl font-bold text-gray-900">42</p>
              <p className="text-xs text-gray-500 mt-1">등록된 영상</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">정책소식</h4>
              <p className="text-2xl font-bold text-gray-900">128</p>
              <p className="text-xs text-gray-500 mt-1">게시글 수</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">비즈니스보이스</h4>
              <p className="text-2xl font-bold text-gray-900">15</p>
              <p className="text-xs text-gray-500 mt-1">인터뷰 수</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">전문가서비스</h4>
              <p className="text-2xl font-bold text-gray-900">36</p>
              <p className="text-xs text-gray-500 mt-1">등록 전문가</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}