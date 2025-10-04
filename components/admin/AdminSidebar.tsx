'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  VideoCameraIcon,
  NewspaperIcon,
  MicrophoneIcon,
  UserGroupIcon,
  ChartBarIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';

interface AdminSidebarProps {
  onLogout: () => void;
}

export default function AdminSidebar({ onLogout }: AdminSidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    {
      name: '대시보드',
      href: '/admin',
      icon: HomeIcon,
    },
    {
      name: '콘텐츠 관리',
      type: 'group',
      items: [
        {
          name: '나라똔튜브',
          href: '/admin/naraddon-tube',
          icon: VideoCameraIcon,
        },
        {
          name: '정책소식',
          href: '/admin/policy-news',
          icon: NewspaperIcon,
        },
        {
          name: '비즈니스보이스',
          href: '/admin/business-voice',
          icon: MicrophoneIcon,
        },
        {
          name: '전문가서비스',
          href: '/admin/expert-services',
          icon: BriefcaseIcon,
        },
      ],
    },
    {
      name: '사용자 관리',
      href: '/admin/users',
      icon: UserGroupIcon,
    },
    {
      name: '통계',
      href: '/admin/analytics',
      icon: ChartBarIcon,
    },
    {
      name: '설정',
      href: '/admin/settings',
      icon: CogIcon,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-white shadow-sm h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold text-gray-900">나라똔 관리자</h2>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item, index) => {
          if (item.type === 'group') {
            return (
              <div key={index} className="pt-4">
                <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {item.name}
                </p>
                {item.items?.map((subItem) => (
                  <Link
                    key={subItem.href}
                    href={subItem.href}
                    className={`
                      flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1
                      ${isActive(subItem.href)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    {subItem.icon && <subItem.icon className="w-5 h-5 mr-3" />}
                    {subItem.name}
                  </Link>
                ))}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={`
                flex items-center px-3 py-2 text-sm font-medium rounded-md
                ${isActive(item.href!)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              {item.icon && <item.icon className="w-5 h-5 mr-3" />}
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <button
          onClick={onLogout}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}