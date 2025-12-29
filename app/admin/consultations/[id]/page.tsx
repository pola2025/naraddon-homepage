'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { AdminLogger } from '@/lib/admin-logger';
import {
  ConsultationStatus,
  ConsultationPhase,
} from '@/types/consultation.types';
import {
  ArrowLeftIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChatBubbleLeftRightIcon,
  PencilSquareIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  DocumentCheckIcon,
  CurrencyDollarIcon,
  HandRaisedIcon
} from '@heroicons/react/24/outline';

interface ConsultationDetail {
  _id: string;
  // 고객 정보
  userName: string;
  userEmail: string;
  userPhone: string;
  companyName?: string;
  businessNumber?: string;
  businessAddress?: string;

  // 상담 정보
  consultationType: string;
  message: string;
  preferredDate?: Date;
  preferredTime?: string;

  // 추가 정보
  annualRevenue?: string;
  employeeCount?: string;
  region?: string;
  desiredTime?: string;
  consultTypeDetail?: string;

  // 상태 정보
  status: ConsultationStatus;
  currentPhase: ConsultationPhase;

  // 배정 정보
  assignedStaffId?: string;
  assignedStaffName?: string;
  assignedBy?: string;
  assignedAt?: Date;

  // 계약 정보
  contractInfo?: {
    contractDate: Date;
    contractAmount: string;
    contractType: string;
    contractDetails: string;
    contractedBy: string;
  };

  // 시간 정보
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  nextScheduledDate?: Date;

  // 히스토리
  history?: Array<{
    action: string;
    performedBy: string;
    performedAt: Date;
    details?: any;
    memo?: string;
  }>;

  // 메모
  memos?: Array<{
    phase: ConsultationPhase;
    content: string;
    createdBy: string;
    createdAt: Date;
  }>;
}

export default function ConsultationDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const consultationId = params.id as string;

  const [consultation, setConsultation] = useState<ConsultationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'progress' | 'history'>('info');
  const [phaseUpdateModalOpen, setPhaseUpdateModalOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<ConsultationPhase | ''>('');
  const [phaseMemo, setPhaseMemo] = useState('');
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [contractInfo, setContractInfo] = useState({
    amount: '',
    type: '기본계약',
    details: ''
  });

  // 권한 체크 및 데이터 로드
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/auth/login?redirect=/admin/consultations/' + consultationId);
      return;
    }

    const userRole = (session?.user as any)?.role;
    const userEmail = session.user?.email;

    // 관리자, 기업심사관, 전문가만 접근 가능
    if (userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'examiner' && userRole !== 'expert') {
      router.push('/');
      return;
    }

    // 페이지 접근 로그
    AdminLogger.logPageView(`/admin/consultations/${consultationId}`, '상담 상세');

    fetchConsultationDetail();
  }, [status, session, router, consultationId]);

  const fetchConsultationDetail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/consultations/${consultationId}`);
      const data = await response.json();

      if (response.ok) {
        setConsultation(data);
        setSelectedPhase(data.currentPhase);
      } else {
        alert('상담 정보를 불러올 수 없습니다.');
        router.push('/admin/consultations');
      }
    } catch (error) {
      console.error('Failed to fetch consultation detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhaseUpdate = async () => {
    if (!selectedPhase) return;

    try {
      const response = await fetch(`/api/consultations/${consultationId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: selectedPhase,
          memo: phaseMemo,
          status: selectedPhase === ConsultationPhase.CONTRACT
            ? ConsultationStatus.CONTRACTED
            : selectedPhase === ConsultationPhase.HAPPY_CALL && phaseMemo.includes('완료')
            ? ConsultationStatus.COMPLETED
            : ConsultationStatus.IN_PROGRESS
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('상담 단계가 업데이트되었습니다.');
        setPhaseUpdateModalOpen(false);
        setPhaseMemo('');
        fetchConsultationDetail();
      } else {
        alert(data.error || '업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to update phase:', error);
      alert('업데이트 중 오류가 발생했습니다.');
    }
  };

  const handleContractSubmit = async () => {
    if (!contractInfo.amount || !contractInfo.details) {
      alert('계약 정보를 모두 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(`/api/consultations/${consultationId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: ConsultationPhase.CONTRACT,
          status: ConsultationStatus.CONTRACTED,
          memo: `계약 체결: ${contractInfo.amount}원, ${contractInfo.type}`,
          contractInfo
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('계약이 체결되었습니다.');
        setContractModalOpen(false);
        setContractInfo({ amount: '', type: '기본계약', details: '' });
        fetchConsultationDetail();
      } else {
        alert(data.error || '계약 체결에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to submit contract:', error);
      alert('계약 체결 중 오류가 발생했습니다.');
    }
  };

  const getPhaseProgress = () => {
    const phases = [
      ConsultationPhase.PHONE,
      ConsultationPhase.MEETING,
      ConsultationPhase.CONTRACT,
      ConsultationPhase.HAPPY_CALL
    ];

    const currentIndex = phases.indexOf(consultation?.currentPhase || ConsultationPhase.PHONE);

    return phases.map((phase, index) => ({
      phase,
      isCompleted: index < currentIndex,
      isCurrent: index === currentIndex,
      isPending: index > currentIndex
    }));
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

  if (loading || !consultation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
          <p className="mt-2 text-gray-600">상담 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isAssignedStaff = consultation.assignedStaffId === session?.user?.email;
  const canEdit = isAdmin || isAssignedStaff;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/consultations')}
            className="flex items-center text-sm text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            목록으로 돌아가기
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                상담 상세 정보
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                ID: {consultationId}
              </p>
            </div>

            <div className="flex space-x-2">
              {consultation.status === ConsultationStatus.IN_PROGRESS && canEdit && (
                <button
                  onClick={() => setPhaseUpdateModalOpen(true)}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  단계 업데이트
                </button>
              )}
              {consultation.currentPhase === ConsultationPhase.MEETING && canEdit && (
                <button
                  onClick={() => setContractModalOpen(true)}
                  className="px-4 py-2 text-sm text-white bg-purple-600 rounded-md hover:bg-purple-700"
                >
                  계약 체결
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 진행 상태 표시 */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-lg font-semibold mb-4">진행 상태</h2>
          <div className="flex items-center justify-between">
            {getPhaseProgress().map((item, index) => (
              <div key={item.phase} className="flex items-center">
                <div className="relative">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${item.isCompleted ? 'bg-green-500' : item.isCurrent ? 'bg-blue-500' : 'bg-gray-300'}
                  `}>
                    {item.isCompleted ? (
                      <CheckCircleIcon className="h-6 w-6 text-white" />
                    ) : item.phase === ConsultationPhase.PHONE ? (
                      <PhoneIcon className="h-5 w-5 text-white" />
                    ) : item.phase === ConsultationPhase.MEETING ? (
                      <CalendarIcon className="h-5 w-5 text-white" />
                    ) : item.phase === ConsultationPhase.CONTRACT ? (
                      <DocumentCheckIcon className="h-5 w-5 text-white" />
                    ) : (
                      <HandRaisedIcon className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div className="text-center mt-2">
                    <p className={`text-sm ${item.isCurrent ? 'font-semibold' : ''}`}>
                      {item.phase === ConsultationPhase.PHONE && '통화상담'}
                      {item.phase === ConsultationPhase.MEETING && '대면상담'}
                      {item.phase === ConsultationPhase.CONTRACT && '계약체결'}
                      {item.phase === ConsultationPhase.HAPPY_CALL && '해피콜'}
                    </p>
                  </div>
                </div>
                {index < getPhaseProgress().length - 1 && (
                  <ChevronRightIcon className="h-5 w-5 text-gray-400 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('info')}
                className={`py-2 px-6 text-sm font-medium ${
                  activeTab === 'info'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                기본 정보
              </button>
              <button
                onClick={() => setActiveTab('progress')}
                className={`py-2 px-6 text-sm font-medium ${
                  activeTab === 'progress'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                진행 메모
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-2 px-6 text-sm font-medium ${
                  activeTab === 'history'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                활동 기록
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* 기본 정보 탭 */}
            {activeTab === 'info' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 고객 정보 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">고객 정보</h3>
                  <dl className="space-y-2">
                    <div className="flex items-start">
                      <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <dt className="text-sm text-gray-500">이름</dt>
                        <dd className="text-sm font-medium">{consultation.userName}</dd>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <dt className="text-sm text-gray-500">이메일</dt>
                        <dd className="text-sm font-medium">{consultation.userEmail}</dd>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <PhoneIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <dt className="text-sm text-gray-500">전화번호</dt>
                        <dd className="text-sm font-medium">{consultation.userPhone}</dd>
                      </div>
                    </div>
                    {consultation.companyName && (
                      <div className="flex items-start">
                        <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <dt className="text-sm text-gray-500">회사명</dt>
                          <dd className="text-sm font-medium">{consultation.companyName}</dd>
                        </div>
                      </div>
                    )}
                    {consultation.businessNumber && (
                      <div className="flex items-start">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <dt className="text-sm text-gray-500">사업자번호</dt>
                          <dd className="text-sm font-medium">{consultation.businessNumber}</dd>
                        </div>
                      </div>
                    )}
                    {consultation.region && (
                      <div className="flex items-start">
                        <span className="text-lg mr-2">📍</span>
                        <div>
                          <dt className="text-sm text-gray-500">지역</dt>
                          <dd className="text-sm font-medium text-blue-600">{consultation.region}</dd>
                        </div>
                      </div>
                    )}
                  </dl>
                </div>

                {/* 상담 정보 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">상담 정보</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500">상담 유형</dt>
                      <dd className="text-sm font-medium">{consultation.consultationType}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">상담 내용</dt>
                      <dd className="text-sm">{consultation.message}</dd>
                    </div>
                    {consultation.preferredDate && (
                      <div>
                        <dt className="text-sm text-gray-500">희망 일시</dt>
                        <dd className="text-sm font-medium">
                          {formatDate(consultation.preferredDate)}
                          {consultation.preferredTime && ` ${consultation.preferredTime}`}
                        </dd>
                      </div>
                    )}
                    {consultation.annualRevenue && (
                      <div>
                        <dt className="text-sm text-gray-500">연매출</dt>
                        <dd className="text-sm font-medium">{consultation.annualRevenue}</dd>
                      </div>
                    )}
                    {consultation.employeeCount && (
                      <div>
                        <dt className="text-sm text-gray-500">직원수</dt>
                        <dd className="text-sm font-medium">{consultation.employeeCount}명</dd>
                      </div>
                    )}
                    {consultation.consultTypeDetail && (
                      <div>
                        <dt className="text-sm text-gray-500">상담희망분야</dt>
                        <dd className="text-sm font-medium text-indigo-600">{consultation.consultTypeDetail}</dd>
                      </div>
                    )}
                    {consultation.desiredTime && (
                      <div>
                        <dt className="text-sm text-gray-500">심사 희망 시간</dt>
                        <dd className="text-sm font-medium">{consultation.desiredTime}</dd>
                      </div>
                    )}
                  </dl>

                  {/* 담당자 정보 */}
                  {consultation.assignedStaffName && (
                    <div className="mt-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">담당자</h4>
                      <div className="bg-gray-50 rounded p-3">
                        <p className="text-sm font-medium">{consultation.assignedStaffName}</p>
                        <p className="text-xs text-gray-500">
                          배정일: {consultation.assignedAt && formatDate(consultation.assignedAt)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 계약 정보 */}
                  {consultation.contractInfo && (
                    <div className="mt-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">계약 정보</h4>
                      <div className="bg-green-50 rounded p-3">
                        <div className="flex items-center mb-2">
                          <CurrencyDollarIcon className="h-4 w-4 text-green-600 mr-1" />
                          <p className="text-sm font-medium">
                            {consultation.contractInfo.contractAmount}원
                          </p>
                        </div>
                        <p className="text-xs text-gray-600">
                          {consultation.contractInfo.contractType}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          체결일: {formatDate(consultation.contractInfo.contractDate)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 진행 메모 탭 */}
            {activeTab === 'progress' && (
              <div>
                {consultation.memos && consultation.memos.length > 0 ? (
                  <div className="space-y-4">
                    {consultation.memos.map((memo, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center">
                            {memo.phase === ConsultationPhase.PHONE && <PhoneIcon className="h-4 w-4 mr-2 text-blue-500" />}
                            {memo.phase === ConsultationPhase.MEETING && <CalendarIcon className="h-4 w-4 mr-2 text-purple-500" />}
                            {memo.phase === ConsultationPhase.CONTRACT && <DocumentCheckIcon className="h-4 w-4 mr-2 text-green-500" />}
                            {memo.phase === ConsultationPhase.HAPPY_CALL && <HandRaisedIcon className="h-4 w-4 mr-2 text-orange-500" />}
                            <span className="text-sm font-medium">
                              {memo.phase === ConsultationPhase.PHONE && '통화상담'}
                              {memo.phase === ConsultationPhase.MEETING && '대면상담'}
                              {memo.phase === ConsultationPhase.CONTRACT && '계약체결'}
                              {memo.phase === ConsultationPhase.HAPPY_CALL && '해피콜'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDate(memo.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{memo.content}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          작성자: {memo.createdBy}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">아직 작성된 메모가 없습니다.</p>
                  </div>
                )}
              </div>
            )}

            {/* 활동 기록 탭 */}
            {activeTab === 'history' && (
              <div>
                {consultation.history && consultation.history.length > 0 ? (
                  <div className="space-y-4">
                    {consultation.history.map((item, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <ClockIcon className="h-4 w-4 text-gray-500" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">{item.performedBy}</span>
                            {item.action === 'assigned' && '님이 상담을 배정했습니다'}
                            {item.action === 'status_update' && '님이 상태를 업데이트했습니다'}
                            {item.action === 'phase_update' && '님이 단계를 변경했습니다'}
                          </p>
                          {item.memo && (
                            <p className="text-sm text-gray-600 mt-1">"{item.memo}"</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(item.performedAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">활동 기록이 없습니다.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 단계 업데이트 모달 */}
        {phaseUpdateModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setPhaseUpdateModalOpen(false)} />

              <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl p-6">
                <h3 className="text-lg font-semibold mb-4">상담 단계 업데이트</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      다음 단계 선택
                    </label>
                    <select
                      value={selectedPhase}
                      onChange={(e) => setSelectedPhase(e.target.value as ConsultationPhase)}
                      className="w-full border-gray-300 rounded-md"
                    >
                      <option value={ConsultationPhase.PHONE}>통화상담</option>
                      <option value={ConsultationPhase.MEETING}>대면상담</option>
                      <option value={ConsultationPhase.CONTRACT}>계약체결</option>
                      <option value={ConsultationPhase.HAPPY_CALL}>해피콜</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      진행 메모
                    </label>
                    <textarea
                      value={phaseMemo}
                      onChange={(e) => setPhaseMemo(e.target.value)}
                      rows={4}
                      className="w-full border-gray-300 rounded-md"
                      placeholder="상담 진행 내용을 기록해주세요"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-2">
                  <button
                    onClick={() => setPhaseUpdateModalOpen(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    취소
                  </button>
                  <button
                    onClick={handlePhaseUpdate}
                    className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    업데이트
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 계약 체결 모달 */}
        {contractModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setContractModalOpen(false)} />

              <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl p-6">
                <h3 className="text-lg font-semibold mb-4">계약 체결</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      계약 금액
                    </label>
                    <input
                      type="text"
                      value={contractInfo.amount}
                      onChange={(e) => setContractInfo({...contractInfo, amount: e.target.value})}
                      className="w-full border-gray-300 rounded-md"
                      placeholder="1,000,000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      계약 유형
                    </label>
                    <select
                      value={contractInfo.type}
                      onChange={(e) => setContractInfo({...contractInfo, type: e.target.value})}
                      className="w-full border-gray-300 rounded-md"
                    >
                      <option value="기본계약">기본계약</option>
                      <option value="프리미엄계약">프리미엄계약</option>
                      <option value="맞춤형계약">맞춤형계약</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      계약 상세
                    </label>
                    <textarea
                      value={contractInfo.details}
                      onChange={(e) => setContractInfo({...contractInfo, details: e.target.value})}
                      rows={4}
                      className="w-full border-gray-300 rounded-md"
                      placeholder="계약 조건 및 특이사항"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-2">
                  <button
                    onClick={() => setContractModalOpen(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleContractSubmit}
                    className="px-4 py-2 text-sm text-white bg-purple-600 rounded-md hover:bg-purple-700"
                  >
                    계약 체결
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