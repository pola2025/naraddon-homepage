'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

/* 경로별 페이지 이름 매핑 */
const pageNames: Record<string, string> = {
  '/admin/dashboard': '대시보드',
  '/admin/analytics': '종합 분석',
  '/admin/naraddon-tube': '인터뷰 영상',
  '/admin/policy-news': '정책소식',
  '/admin/policy-analysis': '정책분석',
  '/admin/shorts': '쇼츠',
  '/admin/expert-services': '전문가 관리',
  '/admin/examiners': '심사관 관리',
  '/admin/consultations': '상담 관리',
  '/admin/users': '사용자 관리',
  '/admin/logs': '활동 로그',
  '/admin/settings': '설정',
};

function getPageName(pathname: string): string {
  /* 정확한 매칭 먼저 시도 */
  if (pageNames[pathname]) return pageNames[pathname];

  /* 하위 경로 매칭 (예: /admin/consultations/123) */
  const basePath = Object.keys(pageNames).find((key) => pathname.startsWith(key));
  return basePath ? pageNames[basePath] : '관리자';
}

export default function AdminHeader() {
  const pathname = usePathname();
  const pageName = getPageName(pathname);

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-8 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">관리자 &gt; {pageName}</p>
          <h1 className="text-lg font-bold text-gray-900">{pageName}</h1>
        </div>

        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
        >
          <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-1.5" />
          사이트 보기
        </Link>
      </div>
    </header>
  );
}
