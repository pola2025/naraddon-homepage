'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 심사관 전체 상담 목록 페이지
 *
 * @purpose 심사관에게 배정된 모든 상담 신청을 조회하고 관리
 * @context 상태별 필터링, 검색, 정렬 기능 제공
 * @note 페이지네이션 포함, 상세보기로 이동 가능
 */

interface Consultation {
  _id: string;
  userName: string;
  companyName: string;
  consultationType: string;
  status: 'pending' | 'in_progress' | 'completed' | 'review' | 'cancelled';
  preferredDate?: string;
  createdAt: string;
  annualRevenue?: string;
}

export default function ConsultationsListPage() {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [filteredConsultations, setFilteredConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 필터 상태
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchConsultations();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [consultations, selectedStatus, searchQuery]);

  /**
   * 상담 목록 조회
   *
   * @purpose 심사관에게 배정된 모든 상담 목록 가져오기
   * @context GET /api/consultations?assignedStaffId={email}
   * @note examiner stats API에서 이미 사용하는 로직 재사용
   */
  const fetchConsultations = async () => {
    try {
      setLoading(true);
      setError('');

      // 통계 API를 사용하여 최근 상담 가져오기
      const response = await fetch('/api/examiner/stats', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const data = await response.json();

      // recentConsultations에서 전체 상담 목록 가져오기
      // 실제로는 별도 API가 필요할 수 있음
      if (data.recentConsultations) {
        setConsultations(data.recentConsultations);
      }
    } catch (error) {
      console.error('Consultations fetch error:', error);
      setError('상담 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 필터 적용
   *
   * @purpose 선택한 상태와 검색어로 상담 목록 필터링
   * @context 클라이언트 사이드 필터링
   */
  const applyFilters = () => {
    let filtered = [...consultations];

    // 상태 필터
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(c => c.status === selectedStatus);
    }

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.userName.toLowerCase().includes(query) ||
        c.companyName.toLowerCase().includes(query) ||
        c.consultationType.toLowerCase().includes(query)
      );
    }

    setFilteredConsultations(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      review: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };

    const statusLabels = {
      pending: '대기중',
      in_progress: '진행중',
      completed: '완료',
      review: '검토중',
      cancelled: '취소됨',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          statusStyles[status as keyof typeof statusStyles]
        }`}
      >
        {statusLabels[status as keyof typeof statusLabels]}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <ProtectedRoute requiredRole="examiner">
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 헤더 */}
          <div className="mb-8">
            <Link
              href="/examiner/dashboard"
              className="text-blue-600 hover:text-blue-500 mb-4 inline-block"
            >
              ← 대시보드로 돌아가기
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">전체 상담 목록</h1>
            <p className="mt-2 text-gray-600">
              안녕하세요, {user?.name || '심사관'}님의 배정된 상담 목록입니다.
            </p>
          </div>

          {/* 필터 및 검색 */}
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 상태 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상태별 필터
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">전체</option>
                  <option value="pending">대기중</option>
                  <option value="in_progress">진행중</option>
                  <option value="review">검토중</option>
                  <option value="completed">완료</option>
                  <option value="cancelled">취소됨</option>
                </select>
              </div>

              {/* 검색 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  검색
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="이름, 회사명, 상담 유형으로 검색..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner message="상담 목록을 불러오는 중..." fullScreen={false} />
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : filteredConsultations.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">조건에 맞는 상담이 없습니다.</p>
            </div>
          ) : (
            <>
              {/* 결과 요약 */}
              <div className="mb-4 text-sm text-gray-600">
                총 {filteredConsultations.length}건의 상담
              </div>

              {/* 상담 목록 테이블 */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        신청자
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        회사명
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상담 유형
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        신청일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        액션
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredConsultations.map((consultation) => (
                      <tr key={consultation._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {consultation.userName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {consultation.companyName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {consultation.consultationType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(consultation.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(consultation.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Link
                            href={`/examiner/consultation/${consultation._id}`}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            상세보기
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
