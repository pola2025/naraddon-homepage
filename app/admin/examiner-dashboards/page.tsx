'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';

/**
 * 관리자용 심사관 상담관리 페이지 (테이블 형식)
 *
 * @purpose 관리자가 모든 심사관의 상담 활동을 조회
 * @context 심사관 목록을 테이블로 표시하고 검색 기능 제공
 * @note 관리자 권한 필요, 검색 기능으로 이름/이메일/회사명 검색 가능
 */

interface Examiner {
  _id: string;
  name: string;
  email: string | null;
  companyName: string;
  legacyKey?: string;
}

interface ExaminerStats {
  examiner: Examiner;
  assignedConsultations: number;
  completedConsultations: number;
  pendingReviews: number;
  averageRating: number;
}

export default function AdminExaminerDashboards() {
  const router = useRouter();
  const [examiners, setExaminers] = useState<Examiner[]>([]);
  const [stats, setStats] = useState<Record<string, ExaminerStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'name' | 'company' | 'assigned' | 'completed' | 'pending'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchExaminers();
  }, []);

  /**
   * 모든 심사관 목록 조회
   *
   * @purpose 관리자가 선택할 수 있는 심사관 목록 가져오기
   */
  const fetchExaminers = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/admin/examiners', {
        headers: {
          'x-admin-auth': 'true'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch examiners');
      }

      const data = await response.json();
      if (data.examiners) {
        setExaminers(data.examiners);
        // 각 심사관의 통계를 자동으로 가져오기
        await fetchAllStats(data.examiners);
      }
    } catch (error) {
      console.error('Error fetching examiners:', error);
      setError('심사관 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 모든 심사관의 통계 조회
   *
   * @purpose 각 심사관별 통계를 API로 가져오기
   * @param examiners 심사관 목록
   */
  const fetchAllStats = async (examiners: Examiner[]) => {
    const statsPromises = examiners.map(async (examiner) => {
      // 이메일이 없는 심사관은 통계 조회 생략
      if (!examiner.email) {
        return null;
      }

      try {
        const response = await fetch(`/api/examiner/stats?examinerEmail=${encodeURIComponent(examiner.email)}`, {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          return {
            examinerId: examiner._id,
            stats: {
              examiner,
              ...data
            }
          };
        }
      } catch (error) {
        console.error(`Error fetching stats for ${examiner.name}:`, error);
      }
      return null;
    });

    const results = await Promise.all(statsPromises);
    const statsMap: Record<string, ExaminerStats> = {};

    results.forEach((result) => {
      if (result) {
        statsMap[result.examinerId] = result.stats;
      }
    });

    setStats(statsMap);
  };

  /**
   * 검색 및 정렬된 심사관 목록
   */
  const filteredAndSortedExaminers = useMemo(() => {
    // 검색 필터링
    let filtered = examiners.filter((examiner) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        examiner.name.toLowerCase().includes(searchLower) ||
        (examiner.email && examiner.email.toLowerCase().includes(searchLower)) ||
        examiner.companyName.toLowerCase().includes(searchLower)
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
        case 'assigned':
          compareValue = (stats[a._id]?.assignedConsultations ?? 0) - (stats[b._id]?.assignedConsultations ?? 0);
          break;
        case 'completed':
          compareValue = (stats[a._id]?.completedConsultations ?? 0) - (stats[b._id]?.completedConsultations ?? 0);
          break;
        case 'pending':
          compareValue = (stats[a._id]?.pendingReviews ?? 0) - (stats[b._id]?.pendingReviews ?? 0);
          break;
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [examiners, stats, searchTerm, sortField, sortDirection]);

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

  const handleViewDashboard = (examinerEmail: string | null) => {
    if (!examinerEmail) {
      alert('이 심사관의 이메일 정보가 없습니다.');
      return;
    }
    router.push(`/admin/examiner-dashboard?examinerEmail=${encodeURIComponent(examinerEmail)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8">
          <Link
            href="/admin/dashboard"
            className="text-blue-600 hover:text-blue-500 mb-4 inline-block"
          >
            ← 관리자 대시보드로 돌아가기
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">심사관 상담관리</h1>
          <p className="mt-2 text-gray-600">
            모든 심사관의 상담 활동 통계를 조회합니다.
          </p>
        </div>

        {/* 검색 바 */}
        <div className="mb-6">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="심사관 이름, 이메일, 회사명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {searchTerm && (
            <p className="mt-2 text-sm text-gray-600">
              검색 결과: {filteredAndSortedExaminers.length}명
            </p>
          )}
        </div>

        {loading ? (
          <LoadingSpinner message="심사관 정보를 불러오는 중..." fullScreen={false} />
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : examiners.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">등록된 심사관이 없습니다.</p>
          </div>
        ) : (
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
                      심사관 <SortIcon field="name" />
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('company')}
                    >
                      회사 <SortIcon field="company" />
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      이메일
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('assigned')}
                    >
                      배정 <SortIcon field="assigned" />
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('completed')}
                    >
                      완료 <SortIcon field="completed" />
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('pending')}
                    >
                      검토대기 <SortIcon field="pending" />
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedExaminers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        검색 결과가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedExaminers.map((examiner) => {
                      const examinerStats = stats[examiner._id];
                      return (
                        <tr
                          key={examiner._id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleViewDashboard(examiner.email)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {examiner.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {examiner.companyName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {examiner.email || '이메일 없음'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {examinerStats ? (
                              <span className="text-sm font-semibold text-blue-600">
                                {examinerStats.assignedConsultations}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {examinerStats ? (
                              <span className="text-sm font-semibold text-green-600">
                                {examinerStats.completedConsultations}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {examinerStats ? (
                              <span className="text-sm font-semibold text-purple-600">
                                {examinerStats.pendingReviews}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDashboard(examiner.email);
                              }}
                              disabled={!examiner.email}
                              className={`font-medium text-sm ${
                                examiner.email
                                  ? 'text-blue-600 hover:text-blue-900'
                                  : 'text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              상세보기
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* 통계 요약 */}
            {filteredAndSortedExaminers.length > 0 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>총 {filteredAndSortedExaminers.length}명의 심사관</span>
                  <span>
                    전체 배정: {Object.values(stats).reduce((sum, s) => sum + (s.assignedConsultations || 0), 0)} |
                    전체 완료: {Object.values(stats).reduce((sum, s) => sum + (s.completedConsultations || 0), 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
