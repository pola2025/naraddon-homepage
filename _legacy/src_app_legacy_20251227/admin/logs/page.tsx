'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AdminAccessLog, AdminActionType, AdminLogSeverity } from '@/types/admin-log.types';
import { AdminLogger } from '@/lib/admin-logger';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShieldExclamationIcon,
  FunnelIcon,
  ArrowPathIcon,
  MapPinIcon,
  ComputerDesktopIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

export default function AdminLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [logs, setLogs] = useState<AdminAccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    adminId: '',
    action: '',
    severity: '',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0
  });

  // 권한 체크 및 페이지 접근 로그
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/auth/login?redirect=/admin/logs');
      return;
    }

    const userRole = (session?.user as any)?.role;
    // super_admin만 접근 가능 (일반 승격 admin은 마이페이지에서 관리 기능 사용)
    if (userRole !== 'super_admin') {
      router.push('/');
      return;
    }

    // 페이지 접근 로그
    AdminLogger.logPageView('/admin/logs', '관리자 활동 로그');

    fetchLogs();
  }, [status, session, router]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value)
        )
      });

      const response = await fetch(`/api/admin/logs?${params}`);
      const data = await response.json();

      if (response.ok) {
        setLogs(data.logs || []);
        setPagination(prev => ({
          ...prev,
          total: data.total || 0
        }));
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    setPagination(prev => ({ ...prev, offset: 0 }));
    fetchLogs();
  };

  const handleClearFilters = () => {
    setFilters({
      adminId: '',
      action: '',
      severity: '',
      startDate: '',
      endDate: ''
    });
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const getSeverityIcon = (severity: AdminLogSeverity) => {
    switch (severity) {
      case AdminLogSeverity.CRITICAL:
        return <ShieldExclamationIcon className="h-5 w-5 text-red-500" />;
      case AdminLogSeverity.WARNING:
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  const getActionBadge = (action: AdminActionType) => {
    const styles = {
      [AdminActionType.LOGIN]: 'bg-green-100 text-green-800',
      [AdminActionType.LOGOUT]: 'bg-gray-100 text-gray-800',
      [AdminActionType.VIEW_PAGE]: 'bg-blue-100 text-blue-800',
      [AdminActionType.CREATE]: 'bg-purple-100 text-purple-800',
      [AdminActionType.UPDATE]: 'bg-yellow-100 text-yellow-800',
      [AdminActionType.DELETE]: 'bg-red-100 text-red-800',
      [AdminActionType.ROLE_CHANGE]: 'bg-orange-100 text-orange-800',
      [AdminActionType.SETTINGS_CHANGE]: 'bg-indigo-100 text-indigo-800',
      [AdminActionType.USER_MANAGEMENT]: 'bg-pink-100 text-pink-800',
      [AdminActionType.DATA_EXPORT]: 'bg-cyan-100 text-cyan-800',
      [AdminActionType.SYSTEM_CHANGE]: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[action] || 'bg-gray-100 text-gray-800'}`}>
        {action}
      </span>
    );
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
          <p className="mt-2 text-gray-600">로그 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">관리자 활동 로그</h1>
          <p className="mt-2 text-gray-600">
            모든 관리자의 활동 내역과 IP 변경 이력을 확인할 수 있습니다.
          </p>
        </div>

        {/* 필터 섹션 */}
        <div className="mb-6 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <FunnelIcon className="h-5 w-5 mr-2" />
                필터 {showFilters ? '숨기기' : '표시'}
              </button>
              <button
                onClick={fetchLogs}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                새로고침
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="p-6 border-b bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    관리자
                  </label>
                  <input
                    type="text"
                    value={filters.adminId}
                    onChange={(e) => handleFilterChange('adminId', e.target.value)}
                    placeholder="이메일 또는 ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    활동 유형
                  </label>
                  <select
                    value={filters.action}
                    onChange={(e) => handleFilterChange('action', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">전체</option>
                    <option value={AdminActionType.LOGIN}>로그인</option>
                    <option value={AdminActionType.LOGOUT}>로그아웃</option>
                    <option value={AdminActionType.VIEW_PAGE}>페이지 조회</option>
                    <option value={AdminActionType.CREATE}>생성</option>
                    <option value={AdminActionType.UPDATE}>수정</option>
                    <option value={AdminActionType.DELETE}>삭제</option>
                    <option value={AdminActionType.ROLE_CHANGE}>역할 변경</option>
                    <option value={AdminActionType.SETTINGS_CHANGE}>설정 변경</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    심각도
                  </label>
                  <select
                    value={filters.severity}
                    onChange={(e) => handleFilterChange('severity', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">전체</option>
                    <option value={AdminLogSeverity.INFO}>정보</option>
                    <option value={AdminLogSeverity.WARNING}>경고</option>
                    <option value={AdminLogSeverity.CRITICAL}>중요</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    시작일
                  </label>
                  <input
                    type="datetime-local"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    종료일
                  </label>
                  <input
                    type="datetime-local"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  초기화
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  필터 적용
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 로그 목록 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    시간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    관리자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    활동
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    설명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP 주소
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    심각도
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      로그가 없습니다
                    </td>
                  </tr>
                ) : (
                  logs.map((log, index) => (
                    <tr key={log.id || index} className={log.isNewIp ? 'bg-yellow-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1 text-gray-400" />
                          {formatDate(log.timestamp)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div>
                          <div className="font-medium text-gray-900">{log.adminName}</div>
                          <div className="text-gray-500">{log.adminEmail}</div>
                          <div className="text-xs text-gray-400">
                            {log.provider} / {log.adminRole}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={log.description}>
                          {log.description}
                        </div>
                        {log.targetResource && (
                          <div className="text-xs text-gray-500">
                            대상: {log.targetResource} {log.targetId && `(${log.targetId})`}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center">
                          <MapPinIcon className="h-4 w-4 mr-1 text-gray-400" />
                          <div>
                            <div className="text-gray-900">{log.ipAddress}</div>
                            {log.isNewIp && log.previousIpAddress && (
                              <div className="text-xs text-red-600">
                                이전: {log.previousIpAddress}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getSeverityIcon(log.severity)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {pagination.total > pagination.limit && (
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                전체 {pagination.total}건 중 {pagination.offset + 1}-
                {Math.min(pagination.offset + pagination.limit, pagination.total)}건 표시
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }));
                    fetchLogs();
                  }}
                  disabled={pagination.offset === 0}
                  className="px-3 py-1 text-sm border rounded-md disabled:opacity-50"
                >
                  이전
                </button>
                <button
                  onClick={() => {
                    setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }));
                    fetchLogs();
                  }}
                  disabled={pagination.offset + pagination.limit >= pagination.total}
                  className="px-3 py-1 text-sm border rounded-md disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </div>

        {/* IP 변경 알림 */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                IP 주소 변경 감지
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                노란색으로 표시된 행은 새로운 IP 주소에서의 접속을 나타냅니다.
                보안상 중요한 이벤트이므로 주의 깊게 확인하시기 바랍니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}