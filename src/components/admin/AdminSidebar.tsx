'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  VideoCameraIcon,
  NewspaperIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  BriefcaseIcon,
  PresentationChartLineIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  FilmIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

interface AdminSidebarProps {
  onLogout: () => void;
}

/* 사이드바 메뉴 경로 매핑 - 모든 경로는 /admin/ 하위로 통일 */
const menuGroups = [
  {
    items: [
      { name: '대시보드', href: '/admin/dashboard', icon: HomeIcon },
      { name: '종합 분석', href: '/admin/analytics', icon: PresentationChartLineIcon },
    ],
  },
  {
    label: '콘텐츠',
    items: [
      { name: '인터뷰 영상', href: '/admin/naraddon-tube', icon: VideoCameraIcon },
      { name: '정책소식', href: '/admin/policy-news', icon: NewspaperIcon },
      { name: '정책분석', href: '/admin/policy-analysis', icon: DocumentTextIcon },
      { name: '쇼츠', href: '/admin/shorts', icon: FilmIcon },
    ],
  },
  {
    label: '서비스',
    items: [
      { name: '전문가 관리', href: '/admin/expert-services', icon: BriefcaseIcon },
      { name: '심사관 관리', href: '/admin/examiners', icon: ShieldCheckIcon },
    ],
  },
  {
    label: '운영',
    items: [
      { name: '상담 관리', href: '/admin/consultations', icon: ChatBubbleLeftRightIcon },
      { name: '사용자 관리', href: '/admin/users', icon: UserGroupIcon },
      { name: '활동 로그', href: '/admin/logs', icon: ClipboardDocumentListIcon },
    ],
  },
];

export default function AdminSidebar({ onLogout }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return pathname === '/admin/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-56 bg-white border-r border-gray-200 h-full flex flex-col flex-shrink-0">
      {/* 헤더 */}
      <div className="px-5 py-5 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900">나라똔 관리자</h2>
        <p className="text-xs text-gray-400 mt-0.5">관리 시스템</p>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {menuGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
            {group.label && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center px-3 py-2 text-[13px] font-medium rounded-md transition-colors
                    ${
                      isActive(item.href)
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon
                    className={`w-[18px] h-[18px] mr-2.5 flex-shrink-0 ${
                      isActive(item.href) ? 'text-emerald-600' : 'text-gray-400'
                    }`}
                  />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* 로그아웃 */}
      <div className="px-3 py-3 border-t border-gray-100">
        <button
          onClick={onLogout}
          className="flex items-center w-full px-3 py-2 text-[13px] font-medium text-gray-500 rounded-md hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="w-[18px] h-[18px] mr-2.5" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
