'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';

/**
 * 관리자용 전문가 대시보드 목록 페이지
 *
 * @purpose 관리자가 모든 전문가 프로필을 조회하고 선택
 * @context 전문가 목록을 테이블로 표시하고 검색 기능 제공
 * @note 관리자 권한 필요, 검색 기능으로 이름/회사명/전문분야 검색 가능
 */

interface Expert {
  _id: string;
  name: string;
  position: string;
  companyName: string;
  specialties: string[];
  introduction: string;
  phone?: string;
  email?: string;
  isActive: boolean;
}

export default function AdminExpertDashboards() {
  const router = useRouter();
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'name' | 'company' | 'position'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchExperts();
  }, []);

  /**
   * 모든 전문가 목록 조회
   *
   * @purpose 관리자가 선택할 수 있는 전문가 목록 가져오기
   */
  const fetchExperts = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/admin/experts', {
        headers: {
          'x-admin-auth': 'true'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch experts');
      }

      const data = await response.json();
      if (data.experts) {
        setExperts(data.experts);
      }
    } catch (error) {
      console.error('Error fetching experts:', error);
      setError('전문가 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 검색 및 정렬된 전문가 목록
   */
  const filteredAndSortedExperts = useMemo(() => {
    // 검색 필터링
    let filtered = experts.filter((expert) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        expert.name.toLowerCase().includes(searchLower) ||
        expert.companyName.toLowerCase().includes(searchLower) ||
        expert.position.toLowerCase().includes(searchLower) ||
        expert.specialties.some(s => s.toLowerCase().includes(searchLower))
      );
    });

    // 정렬
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortField) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'company':
          compareValue = a.companyName.localeCompare(b.companyName);
          break;
        case 'position':
          compareValue = a.position.localeCompare(b.position);
          break;
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [experts, searchTerm, sortField, sortDirection]);

  /**
   * 정렬 핸들러
   */
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  /**
   * 정렬 아이콘 표시
   */
  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const handleViewDashboard = (expertId: string) => {
    router.push(`/expert-dashboard?expertId=${expertId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="text-blue-600 hover:text-blue-500 mb-4 inline-block"
          >
            ← 관리자 대시보드로 돌아가기
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">전문가 대시보드 관리</h1>
          <p className="mt-2 text-gray-600">전문가를 선택하여 프로필을 확인하고 수정하세요</p>
        </div>

        {/* 검색 */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="sr-only">전문가 검색</label>
              <div className="relative">
                <input
                  type="text"
                  id="search"
                  placeholder="이름, 회사명, 직책, 전문분야로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {filteredAndSortedExperts.length}명 / 전체 {experts.length}명
            </div>
          </div>
        </div>

        {/* 에러 표시 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
            <button
              onClick={fetchExperts}
              className="ml-4 text-sm underline hover:no-underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 로딩 상태 */}
        {loading ? (
          <LoadingSpinner message="전문가 목록을 불러오는 중..." fullScreen />
        ) : (
          /* 전문가 테이블 */
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('name')}
                    >
                      이름 <SortIcon field="name" />
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('position')}
                    >
                      직책 <SortIcon field="position" />
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('company')}
                    >
                      회사명 <SortIcon field="company" />
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      전문분야
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      연락처
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedExperts.length > 0 ? (
                    filteredAndSortedExperts.map((expert) => (
                      <tr key={expert._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{expert.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{expert.position}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{expert.companyName}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {expert.specialties.slice(0, 2).map((specialty, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {specialty}
                              </span>
                            ))}
                            {expert.specialties.length > 2 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                +{expert.specialties.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {expert.phone && <div>{expert.phone}</div>}
                            {expert.email && <div>{expert.email}</div>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleViewDashboard(expert._id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            프로필 관리
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        {searchTerm ? '검색 결과가 없습니다.' : '등록된 전문가가 없습니다.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
