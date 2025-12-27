'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 심사관 보고서 작성/관리 페이지
 *
 * @purpose 완료된 상담에 대한 보고서 작성 및 관리
 * @context 기업심사관은 자신이 담당한 상담의 보고서만 작성 가능
 * @note 보고서는 상담 완료 후 작성, 관리자는 전체 보고서 조회 가능
 */

interface Report {
  _id: string;
  consultationId: string;
  clientName: string;
  companyName: string;
  consultationType: string;
  completedDate: string;
  reportContent?: string;
  hasReport: boolean;
}

export default function ExaminerReportsPage() {
  const { user } = useAuth();
  const [completedConsultations, setCompletedConsultations] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 보고서 작성 모달
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Report | null>(null);
  const [reportContent, setReportContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCompletedConsultations();
  }, []);

  /**
   * 완료된 상담 목록 조회
   *
   * @purpose 보고서 작성 대상인 완료된 상담 목록 가져오기
   * @context 기업심사관은 자신이 담당한 상담만 조회
   */
  const fetchCompletedConsultations = async () => {
    try {
      setLoading(true);
      setError('');

      // stats API 사용 (실제로는 별도의 completed consultations API 필요)
      const response = await fetch('/api/examiner/stats', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const data = await response.json();

      // 완료된 상담만 필터링
      if (data.recentConsultations) {
        const completed = data.recentConsultations
          .filter((c: any) => c.status === 'completed')
          .map((c: any) => ({
            _id: c.id,
            consultationId: c.id,
            clientName: c.clientName,
            companyName: c.companyName,
            consultationType: c.consultationType,
            completedDate: c.scheduledDate,
            hasReport: false, // 실제로는 API에서 확인 필요
          }));
        setCompletedConsultations(completed);
      }
    } catch (error) {
      console.error('Completed consultations fetch error:', error);
      setError('완료된 상담 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 보고서 작성 모달 열기
   *
   * @param consultation 보고서를 작성할 상담
   */
  const openReportModal = (consultation: Report) => {
    setSelectedConsultation(consultation);
    setReportContent('');
    setShowReportModal(true);
  };

  /**
   * 보고서 제출
   *
   * @purpose 작성한 보고서를 서버에 저장
   * @context PUT /api/consultations/[id]/report (구현 필요)
   */
  const submitReport = async () => {
    if (!selectedConsultation) return;

    if (!reportContent.trim()) {
      alert('보고서 내용을 입력해주세요.');
      return;
    }

    try {
      setSubmitting(true);

      // 실제로는 별도의 보고서 API 필요
      // 여기서는 상담 정보 업데이트로 대체
      const response = await fetch(`/api/consultations/${selectedConsultation.consultationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: reportContent,
        }),
      });

      if (!response.ok) {
        throw new Error('보고서 제출 실패');
      }

      alert('보고서가 제출되었습니다.');
      setShowReportModal(false);
      setSelectedConsultation(null);
      setReportContent('');
      fetchCompletedConsultations();
    } catch (error) {
      console.error('Report submit error:', error);
      alert('보고서 제출에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
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
            <h1 className="text-3xl font-bold text-gray-900">보고서 작성</h1>
            <p className="mt-2 text-gray-600">
              완료된 상담에 대한 보고서를 작성하고 관리합니다.
            </p>
          </div>

          {loading ? (
            <LoadingSpinner message="완료된 상담 목록을 불러오는 중..." fullScreen={false} />
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : completedConsultations.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-4 text-gray-500">보고서를 작성할 완료된 상담이 없습니다.</p>
            </div>
          ) : (
            <>
              {/* 완료된 상담 목록 */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900">
                    완료된 상담 ({completedConsultations.length}건)
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          회사명
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          신청자
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          상담 유형
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          완료일
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          보고서
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          액션
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {completedConsultations.map((consultation) => (
                        <tr key={consultation._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {consultation.companyName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {consultation.clientName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {consultation.consultationType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(consultation.completedDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {consultation.hasReport ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                제출 완료
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                미작성
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                            <button
                              onClick={() => openReportModal(consultation)}
                              className="text-blue-600 hover:text-blue-900 font-medium"
                            >
                              {consultation.hasReport ? '보고서 수정' : '보고서 작성'}
                            </button>
                            <Link
                              href={`/examiner/consultation/${consultation.consultationId}`}
                              className="text-gray-600 hover:text-gray-900 font-medium"
                            >
                              상담 보기
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* 보고서 작성 모달 */}
          {showReportModal && selectedConsultation && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">보고서 작성</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedConsultation.companyName} - {selectedConsultation.clientName}
                  </p>
                </div>

                <div className="p-6">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      상담 정보
                    </label>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm">
                      <p><strong>상담 유형:</strong> {selectedConsultation.consultationType}</p>
                      <p className="mt-1"><strong>완료일:</strong> {formatDate(selectedConsultation.completedDate)}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      보고서 내용 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={reportContent}
                      onChange={(e) => setReportContent(e.target.value)}
                      rows={12}
                      placeholder="상담 내용, 결과, 권장 사항 등을 상세히 작성해주세요..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      {reportContent.length} / 5000자
                    </p>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowReportModal(false);
                      setSelectedConsultation(null);
                      setReportContent('');
                    }}
                    disabled={submitting}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    취소
                  </button>
                  <button
                    onClick={submitReport}
                    disabled={submitting || !reportContent.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? '제출 중...' : '보고서 제출'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
