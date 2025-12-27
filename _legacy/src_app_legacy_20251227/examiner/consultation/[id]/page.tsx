'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';

/**
 * 심사관 상담 상세보기 페이지
 *
 * @purpose 심사관이 배정된 상담 신청의 상세 정보를 확인하고 관리
 * @context 상담 정보 조회, 상태 변경, 메모 작성 기능 제공
 * @note 배정된 심사관 또는 관리자만 접근 가능
 */

interface Consultation {
  _id: string;
  userName: string;
  userEmail: string;
  companyName: string;
  phone: string;
  consultationType: string;
  preferredDate?: string;
  preferredTime?: string;
  annualRevenue?: string;
  employeeCount?: string;
  message?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'review' | 'cancelled';
  assignedStaffId?: string;
  assignedStaffName?: string;
  createdAt: string;
  updatedAt: string;
  history?: Array<{
    action: string;
    performedBy: string;
    performedAt: string;
    details?: any;
  }>;
}

export default function ConsultationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const consultationId = params.id as string;

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchConsultation();
  }, [consultationId]);

  /**
   * 상담 상세 정보 조회
   *
   * @purpose MongoDB에서 상담 신청 정보를 가져오기
   * @context GET /api/consultations/[id] 호출
   */
  const fetchConsultation = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/consultations/${consultationId}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`상담 정보 조회 실패: ${response.status}`);
      }

      const data = await response.json();
      setConsultation(data);
    } catch (error) {
      console.error('Consultation fetch error:', error);
      setError('상담 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 상담 상태 변경
   *
   * @purpose 상담의 진행 상태를 업데이트
   * @context PUT /api/consultations/[id]/status 호출
   * @param newStatus 변경할 상태 값
   */
  const updateStatus = async (newStatus: string) => {
    if (!confirm(`상담 상태를 "${getStatusLabel(newStatus)}"(으)로 변경하시겠습니까?`)) {
      return;
    }

    try {
      setUpdating(true);

      const response = await fetch(`/api/consultations/${consultationId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('상태 업데이트 실패');
      }

      alert('상담 상태가 변경되었습니다.');
      fetchConsultation();
    } catch (error) {
      console.error('Status update error:', error);
      alert('상태 변경에 실패했습니다.');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      review: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {getStatusLabel(status)}
      </span>
    );
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '대기중',
      in_progress: '진행중',
      completed: '완료',
      review: '검토중',
      cancelled: '취소됨',
    };
    return labels[status] || status;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="examiner">
        <LoadingSpinner message="상담 정보를 불러오는 중..." fullScreen />
      </ProtectedRoute>
    );
  }

  if (error || !consultation) {
    return (
      <ProtectedRoute requiredRole="examiner">
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error || '상담 정보를 찾을 수 없습니다.'}
            </div>
            <div className="mt-4">
              <Link
                href="/examiner/dashboard"
                className="text-blue-600 hover:text-blue-500"
              >
                ← 대시보드로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="examiner">
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 헤더 */}
          <div className="mb-6">
            <Link
              href="/examiner/dashboard"
              className="text-blue-600 hover:text-blue-500 mb-4 inline-block"
            >
              ← 대시보드로 돌아가기
            </Link>
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">상담 상세 정보</h1>
              {getStatusBadge(consultation.status)}
            </div>
          </div>

          {/* 상담 정보 카드 */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">신청자 정보</h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">이름</dt>
                  <dd className="mt-1 text-sm text-gray-900">{consultation.userName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">이메일</dt>
                  <dd className="mt-1 text-sm text-gray-900">{consultation.userEmail}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">회사명</dt>
                  <dd className="mt-1 text-sm text-gray-900">{consultation.companyName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">연락처</dt>
                  <dd className="mt-1 text-sm text-gray-900">{consultation.phone}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">상담 유형</dt>
                  <dd className="mt-1 text-sm text-gray-900">{consultation.consultationType}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">신청일시</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(consultation.createdAt)}
                  </dd>
                </div>
                {consultation.preferredDate && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">희망 상담 일자</dt>
                    <dd className="mt-1 text-sm text-gray-900">{consultation.preferredDate}</dd>
                  </div>
                )}
                {consultation.preferredTime && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">희망 상담 시간</dt>
                    <dd className="mt-1 text-sm text-gray-900">{consultation.preferredTime}</dd>
                  </div>
                )}
                {consultation.annualRevenue && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">연매출</dt>
                    <dd className="mt-1 text-sm text-gray-900">{consultation.annualRevenue}</dd>
                  </div>
                )}
                {consultation.employeeCount && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">직원 수</dt>
                    <dd className="mt-1 text-sm text-gray-900">{consultation.employeeCount}</dd>
                  </div>
                )}
              </dl>
              {consultation.message && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <dt className="text-sm font-medium text-gray-500 mb-2">상담 요청 내용</dt>
                  <dd className="text-sm text-gray-900 whitespace-pre-wrap">
                    {consultation.message}
                  </dd>
                </div>
              )}
            </div>
          </div>

          {/* 상태 변경 */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">상담 상태 관리</h2>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-3">
                {consultation.status !== 'in_progress' && (
                  <button
                    onClick={() => updateStatus('in_progress')}
                    disabled={updating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    진행 중으로 변경
                  </button>
                )}
                {consultation.status !== 'review' && (
                  <button
                    onClick={() => updateStatus('review')}
                    disabled={updating}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    검토 중으로 변경
                  </button>
                )}
                {consultation.status !== 'completed' && (
                  <button
                    onClick={() => updateStatus('completed')}
                    disabled={updating}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    완료로 변경
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 히스토리 */}
          {consultation.history && consultation.history.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">변경 이력</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {consultation.history.map((item, index) => (
                    <div key={index} className="flex items-start space-x-3 text-sm">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900">
                          <span className="font-medium">{item.action}</span> by {item.performedBy}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          {formatDate(item.performedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
