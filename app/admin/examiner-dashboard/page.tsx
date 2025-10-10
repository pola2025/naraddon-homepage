'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LuClipboardList, LuCheckCircle2, LuEye, LuClock, LuDollarSign } from 'react-icons/lu';

/**
 * 로딩 스피너 컴포넌트 (인라인)
 *
 * @purpose LoadingSpinner import 문제 해결을 위한 인라인 구현
 */
function LoadingSpinner({ message, fullScreen }: { message?: string; fullScreen?: boolean }) {
  const spinner = (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
        <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
      </div>
      {message && <p className="mt-4 text-gray-600 text-sm">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
}

/**
 * 관리자가 특정 심사관의 대시보드를 조회하는 페이지
 *
 * @purpose 관리자가 선택한 심사관의 상담 활동 통계 및 최근 상담 내역 조회
 * @context URL 파라미터로 examinerEmail을 받아 해당 심사관의 데이터를 API로 조회
 * @note 관리자 권한 필요, examinerEmail 파라미터 필수
 */

interface ExaminerStats {
  assignedConsultations: number;
  completedConsultations: number;
  pendingReviews: number;
  averageRating: number;
  recentConsultations: Consultation[];
}

interface Consultation {
  id: string;
  clientName: string;
  companyName: string;
  consultationType: string;
  status: 'pending' | 'in_progress' | 'completed' | 'review';
  scheduledDate: string;
  amount?: string;
}

export default function AdminExaminerDashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const examinerEmail = searchParams.get('examinerEmail');

  const [stats, setStats] = useState<ExaminerStats | null>(null);
  const [examinerName, setExaminerName] = useState<string>('');
  const [examinerCompany, setExaminerCompany] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!examinerEmail) {
      setError('심사관 이메일이 지정되지 않았습니다.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      await Promise.all([fetchExaminerInfo(), fetchExaminerStats()]);
    };

    fetchData();
  }, [examinerEmail]);

  /**
   * 심사관 정보 조회
   */
  const fetchExaminerInfo = async () => {
    try {
      const response = await fetch('/api/admin/examiners', {
        headers: {
          'x-admin-auth': 'true'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const examiner = data.examiners?.find((e: any) => e.email === examinerEmail);
        if (examiner) {
          setExaminerName(examiner.name || '이름 없음');
          setExaminerCompany(examiner.companyName || '회사 정보 없음');
        } else {
          setExaminerName('심사관 정보 없음');
          setExaminerCompany('');
        }
      } else {
        setExaminerName('심사관 정보 없음');
        setExaminerCompany('');
      }
    } catch (error) {
      console.error('Error fetching examiner info:', error);
    }
  };

  /**
   * 심사관 통계 데이터 조회
   */
  const fetchExaminerStats = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/examiner/stats?examinerEmail=${encodeURIComponent(examinerEmail!)}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Examiner stats error:', error);
      setError('대시보드 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      review: 'bg-purple-100 text-purple-800',
    };

    const statusLabels = {
      pending: '대기중',
      in_progress: '진행중',
      completed: '완료',
      review: '검토중',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles]}`}
      >
        {statusLabels[status as keyof typeof statusLabels]}
      </span>
    );
  };

  if (!examinerEmail) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            심사관 이메일이 지정되지 않았습니다.
          </div>
          <div className="mt-4">
            <Link href="/admin/examiner-dashboards" className="text-blue-600 hover:text-blue-500">
              ← 심사관 목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8">
          <Link
            href="/admin/examiner-dashboards"
            className="text-blue-600 hover:text-blue-500 mb-4 inline-block"
          >
            ← 심사관 목록으로 돌아가기
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {examinerName ? `${examinerName} 심사관` : '로딩 중...'}
              </h1>
              <div className="mt-2 space-y-1">
                {examinerCompany && (
                  <p className="text-lg text-gray-600">{examinerCompany}</p>
                )}
                {examinerEmail && (
                  <p className="text-sm text-gray-500">{examinerEmail}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner message="데이터를 불러오는 중..." fullScreen />
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : (
          <>
            {/* 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center text-blue-600 mb-2">
                  <LuClipboardList className="mr-2" size={18} />
                  <p className="text-sm font-medium">배정된 상담</p>
                </div>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats?.assignedConsultations ?? 0}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center text-green-600 mb-2">
                  <LuCheckCircle2 className="mr-2" size={18} />
                  <p className="text-sm font-medium">완료된 상담</p>
                </div>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats?.completedConsultations ?? 0}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center text-purple-600 mb-2">
                  <LuEye className="mr-2" size={18} />
                  <p className="text-sm font-medium">검토 대기</p>
                </div>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats?.pendingReviews ?? 0}
                </p>
              </div>
            </div>

            {/* 최근 상담 목록 */}
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">최근 상담 목록</h2>
              </div>
              <div className="p-6">
                {stats?.recentConsultations && stats.recentConsultations.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recentConsultations.map((consultation) => (
                      <div
                        key={consultation.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h3 className="text-sm font-medium text-gray-900">
                              {consultation.companyName}
                            </h3>
                            <span className="ml-2 text-sm text-gray-500">
                              ({consultation.clientName})
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            {consultation.consultationType}
                          </p>
                          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center">
                              <LuClock className="mr-1" size={14} />
                              {consultation.scheduledDate}
                            </span>
                            {consultation.amount && (
                              <span className="flex items-center">
                                <LuDollarSign className="mr-1" size={14} />
                                {consultation.amount}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {getStatusBadge(consultation.status)}
                          <Link
                            href={`/admin/consultations?id=${consultation.id}`}
                            className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-500"
                          >
                            상세보기
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">최근 상담 내역이 없습니다.</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
