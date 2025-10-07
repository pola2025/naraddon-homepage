'use client';

import Link from 'next/link';
import { BellIcon, UserCircleIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

export default function AdminHeader() {
  const currentDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">관리자 대시보드</h1>
          <p className="mt-1 text-sm text-gray-500">{currentDate}</p>
        </div>

        <div className="flex items-center space-x-4">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
          >
            <ArrowTopRightOnSquareIcon className="w-5 h-5 mr-2" />
            나라똔 페이지 바로가기
          </Link>
          <button className="p-2 text-gray-400 hover:text-gray-500">
            <BellIcon className="w-6 h-6" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-500">
            <UserCircleIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>
  );
}