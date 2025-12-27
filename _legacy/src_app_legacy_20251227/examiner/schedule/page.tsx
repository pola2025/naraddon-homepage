'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 심사관 일정 관리 페이지
 *
 * @purpose 심사관의 상담 일정을 캘린더 형식으로 조회 및 관리
 * @context 날짜별 상담 일정 확인, 필터링 기능 제공
 * @note 간단한 리스트 형식 (향후 캘린더 UI로 확장 가능)
 */

interface ScheduledConsultation {
  _id: string;
  userName: string;
  companyName: string;
  consultationType: string;
  status: string;
  scheduledDate: string;
  preferredTime?: string;
}

export default function ExaminerSchedulePage() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<ScheduledConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    fetchSchedule();
  }, []);

  /**
   * 일정 조회
   *
   * @purpose 심사관의 예정된 상담 일정 가져오기
   * @context stats API를 활용하여 recentConsultations에서 필터링
   */
  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/examiner/stats', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const data = await response.json();

      // 예정된 상담만 필터링 (pending, in_progress 상태)
      if (data.recentConsultations) {
        const upcoming = data.recentConsultations.filter(
          (c: any) => c.status === 'pending' || c.status === 'in_progress'
        );
        setSchedule(upcoming);
      }
    } catch (error) {
      console.error('Schedule fetch error:', error);
      setError('일정을 불러오는데 실패했습니다.');
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
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString?: string) => {
    return timeString || '시간 미정';
  };

  // 날짜별 그룹핑
  const groupByDate = (consultations: ScheduledConsultation[]) => {
    const grouped: Record<string, ScheduledConsultation[]> = {};

    consultations.forEach((consultation) => {
      const dateKey = consultation.scheduledDate.split(' ')[0]; // 날짜 부분만 추출
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(consultation);
    });

    return grouped;
  };

  const groupedSchedule = groupByDate(schedule);
  const sortedDates = Object.keys(groupedSchedule).sort();

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
            <h1 className="text-3xl font-bold text-gray-900">일정 관리</h1>
            <p className="mt-2 text-gray-600">
              {user?.name || '심사관'}님의 예정된 상담 일정입니다.
            </p>
          </div>

          {loading ? (
            <LoadingSpinner message="일정을 불러오는 중..." fullScreen={false} />
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : schedule.length === 0 ? (
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="mt-4 text-gray-500">예정된 상담이 없습니다.</p>
            </div>
          ) : (
            <>
              {/* 일정 요약 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <svg
                    className="h-5 w-5 text-blue-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-blue-900 font-medium">
                    총 {schedule.length}건의 예정된 상담이 있습니다.
                  </span>
                </div>
              </div>

              {/* 날짜별 일정 */}
              <div className="space-y-6">
                {sortedDates.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-8 text-center">
                    <p className="text-gray-500">표시할 일정이 없습니다.</p>
                  </div>
                ) : (
                  sortedDates.map((date) => (
                    <div key={date} className="bg-white rounded-lg shadow">
                      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {formatDate(date)}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          {groupedSchedule[date].length}건의 상담
                        </p>
                      </div>
                      <div className="p-6">
                        <div className="space-y-4">
                          {groupedSchedule[date].map((consultation) => (
                            <div
                              key={consultation._id}
                              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <h3 className="text-sm font-medium text-gray-900">
                                    {consultation.companyName}
                                  </h3>
                                  <span className="ml-2 text-sm text-gray-500">
                                    ({consultation.userName})
                                  </span>
                                </div>
                                <p className="mt-1 text-sm text-gray-600">
                                  {consultation.consultationType}
                                </p>
                                <div className="mt-2 flex items-center space-x-4">
                                  <span className="text-xs text-gray-500">
                                    <svg
                                      className="inline h-4 w-4 mr-1"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                    {formatTime(consultation.preferredTime)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                {getStatusBadge(consultation.status)}
                                <Link
                                  href={`/examiner/consultation/${consultation._id}`}
                                  className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-500"
                                >
                                  상세보기
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
