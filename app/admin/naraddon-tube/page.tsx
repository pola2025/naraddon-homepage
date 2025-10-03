'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

export default function NaraddonTubeAdminPage() {
  const [searchTerm, setSearchTerm] = useState('');

  // 임시 데이터
  const videos = [
    {
      id: 1,
      title: '나라똔 소개 영상',
      views: 1234,
      date: '2025-09-20',
      status: 'published',
      thumbnail: '/images/thumb1.jpg'
    },
    {
      id: 2,
      title: '정책 브리핑 2025',
      views: 892,
      date: '2025-09-19',
      status: 'published',
      thumbnail: '/images/thumb2.jpg'
    },
    {
      id: 3,
      title: '비즈니스 인터뷰 #1',
      views: 456,
      date: '2025-09-18',
      status: 'draft',
      thumbnail: '/images/thumb3.jpg'
    }
  ];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">나라똔튜브 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            영상 콘텐츠를 관리하고 새로운 영상을 업로드합니다.
          </p>
        </div>
        <Link
          href="/admin/naraddon-tube/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          새 영상 등록
        </Link>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="영상 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
            <option value="all">모든 상태</option>
            <option value="published">게시됨</option>
            <option value="draft">초안</option>
          </select>
        </div>
      </div>

      {/* 영상 목록 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                영상
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                조회수
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                등록일
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {videos.map((video) => (
              <tr key={video.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-16 w-24 bg-gray-200 rounded-md mr-4"></div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{video.title}</div>
                      <div className="text-sm text-gray-500">ID: {video.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {video.views.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    video.status === 'published'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {video.status === 'published' ? '게시됨' : '초안'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {video.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button className="text-blue-600 hover:text-blue-900">
                      <EyeIcon className="w-5 h-5" />
                    </button>
                    <button className="text-indigo-600 hover:text-indigo-900">
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg">
        <div className="flex-1 flex justify-between sm:hidden">
          <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            이전
          </button>
          <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            다음
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              전체 <span className="font-medium">3</span> 개 중{' '}
              <span className="font-medium">1</span> - <span className="font-medium">3</span> 표시
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                이전
              </button>
              <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                1
              </button>
              <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                다음
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}