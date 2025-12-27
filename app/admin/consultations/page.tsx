'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AdminLogger } from '@/lib/admin-logger';
import {
  ConsultationStatus,
  ConsultationPhase,
  ConsultationSource,
  CustomerType
} from '@/types/consultation.types';
import {
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
  PhoneIcon,
  CalendarIcon,
  DocumentCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  FunnelIcon,
  ArrowPathIcon,
  UserIcon,
  BuildingOfficeIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

interface Consultation {
  _id: string;
  // 고객 정보
  userName: string;
  userEmail: string;
  userPhone: string;
  companyName?: string;
  businessNumber?: string;

  // 상담 정보
  consultationType: string;
  consultationField?: string;
  message: string;
  preferredDate?: Date;
  preferredTime?: string;

  // 상태 정보
  status: ConsultationStatus;
  currentPhase: ConsultationPhase;
  source: ConsultationSource;
  customerType: CustomerType;

  // 배정 정보
  assignedStaffId?: string;
  assignedStaffName?: string;
  assignedBy?: string;
  assignedAt?: Date;

  // 시간 정보
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;

  // 추가 정보
  annualRevenue?: string;
  employeeCount?: string;
  history?: any[];
  memos?: any[];
}

interface Staff {
  email: string;
  name: string;
  role: string;
  specialty?: string[];
  assignedCount?: number;
}

const convertConsultationField = (value: string): string => {
  const map: Record<string, string> = {
    'legal': '법무·특허',
    'tax': '세무·회계',
    'labor': '인사·노무',
    'marketing': '마케팅·브랜딩',
    'tech': '기술·IT',
    'strategy': '경영전략'
  };
  return map[value] || value;
};

export default function AdminConsultationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsultation, setSelectedConsultation] = useState<string | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [statusUpdateModalOpen, setStatusUpdateModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [assignNotes, setAssignNotes] = useState('');
  const [statusMemo, setStatusMemo] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    phase: '',
    staffId: '',
    consultationType: ''
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // 권한 체크
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/auth/login?redirect=/admin/consultations');
      return;
    }

    const userRole = (session?.user as any)?.role;
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      router.push('/');
      return;
    }

    // 페이지 접근 로그
    AdminLogger.logPageView('/admin/consultations', '상담 관리');

    fetchConsultations();
    fetchStaffList();
  }, [status, session, router]);

  const fetchConsultations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(
        Object.entries(filters).filter(([_, value]) => value)
      );

      const response = await fetch(`/api/consultations?${params}`);
      const data = await response.json();

      if (response.ok && Array.isArray(data)) {
        setConsultations(data);
      }
    } catch (error) {
      console.error('Failed to fetch consultations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffList = async () => {
    try {
      const response = await fetch('/api/admin/users?role=expert,examiner');
      const data = await response.json();

      // API 응답에서 users 배열 추출
      const userList = data.users || data;

      if (response.ok && Array.isArray(userList)) {
        setStaffList(userList.map((user: any) => ({
          email: user.email,
          name: user.name || user.email,
          role: user.role,
          specialty: user.examinerProfile?.specialty || user.expertProfile?.specialty,
          assignedCount: user.assignedConsultations || 0
        })));
      }
    } catch (error) {
      console.error('Failed to fetch staff list:', error);
    }
  };

  const handleAssign = async () => {
    if (!selectedConsultation || !selectedStaff) return;

    try {
      const staff = staffList.find(s => s.email === selectedStaff);
      const response = await fetch(`/api/consultations/${selectedConsultation}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: selectedStaff,
          staffName: staff?.name,
          notes: assignNotes
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        setAssignModalOpen(false);
        setSelectedConsultation(null);
        setSelectedStaff('');
        setAssignNotes('');
        fetchConsultations();
      } else {
        alert(data.error || '배정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to assign consultation:', error);
      alert('배정 중 오류가 발생했습니다.');
    }
  };

  // 상담 삭제 (취소) 처리
  const handleDelete = async () => {
    if (!deleteTargetId) return;

    try {
      const response = await fetch(`/api/consultations/${deleteTargetId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deleteReason || '관리자에 의해 삭제됨' })
      });

      const data = await response.json();

      if (response.ok) {
        alert('상담이 삭제(취소)되었습니다.');
        setDeleteModalOpen(false);
        setDeleteTargetId(null);
        setDeleteReason('');
        fetchConsultations();
      } else {
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete consultation:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleStatusUpdate = async (consultationId: string, newStatus: ConsultationStatus, newPhase?: ConsultationPhase) => {
    try {
      const response = await fetch(`/api/consultations/${consultationId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          phase: newPhase,
          memo: statusMemo
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('상태가 업데이트되었습니다.');
        setStatusUpdateModalOpen(false);
        setStatusMemo('');
        fetchConsultations();
      } else {
        alert(data.error || '상태 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('상태 업데이트 중 오류가 발생했습니다.');
    }
  };

  const getStatusBadge = (status: ConsultationStatus) => {
    const styles = {
      [ConsultationStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [ConsultationStatus.ASSIGNED]: 'bg-blue-100 text-blue-800',
      [ConsultationStatus.IN_PROGRESS]: 'bg-indigo-100 text-indigo-800',
      [ConsultationStatus.CONTRACTED]: 'bg-purple-100 text-purple-800',
      [ConsultationStatus.COMPLETED]: 'bg-green-100 text-green-800',
      [ConsultationStatus.CANCELLED]: 'bg-red-100 text-red-800'
    };

    const labels = {
      [ConsultationStatus.PENDING]: '대기중',
      [ConsultationStatus.ASSIGNED]: '배정됨',
      [ConsultationStatus.IN_PROGRESS]: '진행중',
      [ConsultationStatus.CONTRACTED]: '계약체결',
      [ConsultationStatus.COMPLETED]: '완료',
      [ConsultationStatus.CANCELLED]: '취소'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getPhaseBadge = (phase: ConsultationPhase) => {
    const icons = {
      [ConsultationPhase.PHONE]: <PhoneIcon className="h-4 w-4" />,
      [ConsultationPhase.MEETING]: <CalendarIcon className="h-4 w-4" />,
      [ConsultationPhase.CONTRACT]: <DocumentCheckIcon className="h-4 w-4" />,
      [ConsultationPhase.HAPPY_CALL]: <CheckCircleIcon className="h-4 w-4" />
    };

    const labels = {
      [ConsultationPhase.PHONE]: '통화상담',
      [ConsultationPhase.MEETING]: '대면상담',
      [ConsultationPhase.CONTRACT]: '계약체결',
      [ConsultationPhase.HAPPY_CALL]: '해피콜'
    };

    return (
      <div className="flex items-center space-x-1 text-sm text-gray-600">
        {icons[phase]}
        <span>{labels[phase]}</span>
      </div>
    );
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
          <p className="mt-2 text-gray-600">상담 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-12">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">상담 관리</h1>
          <p className="mt-2 text-gray-600">
            상담 신청 내역을 확인하고 담당자를 배정할 수 있습니다.
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">대기중</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {consultations.filter(c => c.status === ConsultationStatus.PENDING).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">배정됨</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {consultations.filter(c => c.status === ConsultationStatus.ASSIGNED).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <DocumentCheckIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">진행중</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {consultations.filter(c => c.status === ConsultationStatus.IN_PROGRESS).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">완료</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {consultations.filter(c => c.status === ConsultationStatus.COMPLETED).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="border-gray-300 rounded-md text-sm"
                >
                  <option value="">전체 상태</option>
                  <option value={ConsultationStatus.PENDING}>대기중</option>
                  <option value={ConsultationStatus.ASSIGNED}>배정됨</option>
                  <option value={ConsultationStatus.IN_PROGRESS}>진행중</option>
                  <option value={ConsultationStatus.CONTRACTED}>계약체결</option>
                  <option value={ConsultationStatus.COMPLETED}>완료</option>
                  <option value={ConsultationStatus.CANCELLED}>취소</option>
                </select>

                <select
                  value={filters.phase}
                  onChange={(e) => setFilters({...filters, phase: e.target.value})}
                  className="border-gray-300 rounded-md text-sm"
                >
                  <option value="">전체 단계</option>
                  <option value={ConsultationPhase.PHONE}>통화상담</option>
                  <option value={ConsultationPhase.MEETING}>대면상담</option>
                  <option value={ConsultationPhase.CONTRACT}>계약체결</option>
                  <option value={ConsultationPhase.HAPPY_CALL}>해피콜</option>
                </select>

                <select
                  value={filters.consultationType}
                  onChange={(e) => setFilters({...filters, consultationType: e.target.value})}
                  className="border-gray-300 rounded-md text-sm"
                >
                  <option value="">전체 유형</option>
                  <option value="기업심사관 상담">기업심사관 상담</option>
                  <option value="전문가 상담">전문가 상담</option>
                </select>
              </div>

              <button
                onClick={fetchConsultations}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                새로고침
              </button>
            </div>
          </div>
        </div>

        {/* 상담 목록 테이블 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  신청정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상담유형
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태/단계
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  담당자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  신청일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {consultations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    상담 신청이 없습니다
                  </td>
                </tr>
              ) : (
                consultations.map((consultation) => (
                  <tr key={consultation._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {consultation.userName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {consultation.userEmail}
                        </div>
                        <div className="text-sm text-gray-500">
                          {consultation.userPhone}
                        </div>
                        {consultation.companyName && (
                          <div className="text-sm text-gray-500 flex items-center mt-1">
                            <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                            {consultation.companyName}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {consultation.consultationType}
                      </div>
                      {consultation.consultationField && (
                        <div className="text-xs text-indigo-600 mt-1">
                          {convertConsultationField(consultation.consultationField)}
                        </div>
                      )}
                      {consultation.customerType === CustomerType.MEMBER ? (
                        <span className="text-xs text-blue-600">회원</span>
                      ) : (
                        <span className="text-xs text-gray-500">비회원</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {getStatusBadge(consultation.status)}
                        {getPhaseBadge(consultation.currentPhase)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {consultation.assignedStaffName ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {consultation.assignedStaffName}
                          </div>
                          <div className="text-gray-500">
                            {consultation.assignedAt && formatDate(consultation.assignedAt)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">미배정</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(consultation.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        {!consultation.assignedStaffId && (
                          <button
                            onClick={() => {
                              setSelectedConsultation(consultation._id);
                              setAssignModalOpen(true);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            배정
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/admin/consultations/${consultation._id}`)}
                          className="text-sm text-gray-600 hover:text-gray-800"
                        >
                          상세
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTargetId(consultation._id);
                            setDeleteModalOpen(true);
                          }}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 삭제 확인 모달 */}
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setDeleteModalOpen(false)}>
            <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center mb-4">
                <TrashIcon className="h-6 w-6 text-red-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">상담 삭제</h3>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                이 상담을 삭제하시겠습니까? 삭제된 상담은 &apos;취소&apos; 상태로 변경됩니다.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  삭제 사유 (선택)
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={2}
                  className="w-full border-gray-300 rounded-md text-sm"
                  placeholder="삭제 사유를 입력하세요"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setDeleteTargetId(null);
                    setDeleteReason('');
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  취소
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 배정 모달 */}
        {assignModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setAssignModalOpen(false)} />

              <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl p-6">
                <h3 className="text-lg font-semibold mb-4">담당자 배정</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      담당자 선택
                    </label>
                    <select
                      value={selectedStaff}
                      onChange={(e) => setSelectedStaff(e.target.value)}
                      className="w-full border-gray-300 rounded-md"
                    >
                      <option value="">선택하세요</option>
                      {staffList.map((staff) => {
                        let roleLabel = '전문가';
                        if (staff.role === 'examiner') roleLabel = '기업심사관';

                        return (
                          <option key={staff.email} value={staff.email}>
                            {staff.name} ({roleLabel}) - 현재 {staff.assignedCount}건 담당
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      메모 (선택)
                    </label>
                    <textarea
                      value={assignNotes}
                      onChange={(e) => setAssignNotes(e.target.value)}
                      rows={3}
                      className="w-full border-gray-300 rounded-md"
                      placeholder="담당자에게 전달할 메모"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-2">
                  <button
                    onClick={() => setAssignModalOpen(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleAssign}
                    disabled={!selectedStaff}
                    className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    배정하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}