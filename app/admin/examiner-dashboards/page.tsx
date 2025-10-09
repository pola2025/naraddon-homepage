'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';

/**
 * 관리자용 심사관별 대시보드 페이지
 *
 * @purpose 관리자가 모든 심사관의 대시보드를 조회
 * @context 심사관 목록을 표시하고 각 심사관의 통계를 확인
 * @note 관리자 권한 필요
 */

interface Examiner {
  _id: string;
  name: string;
  email: string;
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
  const [selectedExaminer, setSelectedExaminer] = useState<string | null>(null);

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

  const handleViewDashboard = (examinerEmail: string) => {
    // 심사관 이메일을 쿼리 파라미터로 전달하여 대시보드 페이지로 이동
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
          <h1 className="text-3xl font-bold text-gray-900">심사관별 대시보드</h1>
          <p className="mt-2 text-gray-600">
            모든 심사관의 상담 활동 통계를 조회합니다.
          </p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {examiners.map((examiner) => {
              const examinerStats = stats[examiner._id];
              return (
                <div
                  key={examiner._id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleViewDashboard(examiner.email)}
                >
                  <div className="p-6">
                    {/* 심사관 정보 */}
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{examiner.name}</h3>
                      <p className="text-sm text-gray-600">{examiner.companyName}</p>
                      <p className="text-xs text-gray-500 mt-1">{examiner.email}</p>
                    </div>

                    {/* 통계 정보 */}
                    {examinerStats ? (
                      <div className="space-y-3 border-t pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">배정된 상담</span>
                          <span className="text-lg font-semibold text-blue-600">
                            {examinerStats.assignedConsultations}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">완료된 상담</span>
                          <span className="text-lg font-semibold text-green-600">
                            {examinerStats.completedConsultations}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">검토 대기</span>
                          <span className="text-lg font-semibold text-purple-600">
                            {examinerStats.pendingReviews}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">평균 평점</span>
                          <span className="text-lg font-semibold text-yellow-600">
                            {examinerStats.averageRating || 0}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-sm text-gray-500 py-4">
                        통계 로딩 중...
                      </div>
                    )}

                    {/* 버튼 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDashboard(examiner.email);
                      }}
                      className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      상세 대시보드 보기
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
