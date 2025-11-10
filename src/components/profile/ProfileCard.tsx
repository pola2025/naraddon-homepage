'use client';

import { useState } from 'react';
import Image from 'next/image';
import { User, UserRole, UserStatus } from '@/types/user.types';
import {
  UserCircleIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  CalendarIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CheckBadgeIcon,
  PencilIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface ProfileCardProps {
  user: User;
  mode: 'admin' | 'mypage';
  editable?: boolean;
  onEdit?: () => void;
  onRoleChange?: (newRole: UserRole, examinerId?: string, expertId?: string) => void;
  onStatusChange?: (newStatus: UserStatus) => void;
  onUpgradeToAdmin?: (userId: string) => void;
  onRevokeAdmin?: (userId: string) => void;
  className?: string;
}

export default function ProfileCard({
  user,
  mode,
  editable = false,
  onEdit,
  onRoleChange,
  onStatusChange,
  onUpgradeToAdmin,
  onRevokeAdmin,
  className = ''
}: ProfileCardProps) {
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [examiners, setExaminers] = useState<any[]>([]);
  const [experts, setExperts] = useState<any[]>([]);
  const [selectedExaminerId, setSelectedExaminerId] = useState<string>('');
  const [selectedExpertId, setSelectedExpertId] = useState<string>('');

  // 심사관/전문가 목록 불러오기
  const fetchExaminersAndExperts = async () => {
    try {
      const [examinersRes, expertsRes] = await Promise.all([
        fetch('/api/admin/examiners'),
        fetch('/api/admin/experts')
      ]);

      if (examinersRes.ok) {
        const examinersData = await examinersRes.json();
        setExaminers(examinersData.examiners || []);
      }

      if (expertsRes.ok) {
        const expertsData = await expertsRes.json();
        setExperts(expertsData.experts || []);
      }
    } catch (error) {
      console.error('Failed to fetch examiners/experts:', error);
    }
  };

  const handleRoleChangeSubmit = () => {
    if (!selectedRole) return;

    console.log('Role change submit:', {
      selectedRole,
      selectedExaminerId,
      selectedExpertId
    });

    if (selectedRole === UserRole.EXAMINER && selectedExaminerId) {
      onRoleChange?.(selectedRole, selectedExaminerId, undefined);
    } else if (selectedRole === UserRole.EXPERT && selectedExpertId) {
      onRoleChange?.(selectedRole, undefined, selectedExpertId);
    } else if (selectedRole === UserRole.USER || selectedRole === UserRole.ADMIN) {
      onRoleChange?.(selectedRole);
    } else {
      alert('심사관 또는 전문가를 선택해주세요.');
      return;
    }

    setShowRoleModal(false);
    setSelectedRole(null);
    setSelectedExaminerId('');
    setSelectedExpertId('');
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-red-100 text-red-800';
      case UserRole.EXAMINER:
        return 'bg-purple-100 text-purple-800';
      case UserRole.EXPERT:
        return 'bg-blue-100 text-blue-800';
      case UserRole.USER:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return '관리자';
      case UserRole.EXAMINER:
        return '기업심사관';
      case UserRole.EXPERT:
        return '전문가';
      case UserRole.USER:
        return '일반회원';
      default:
        return role;
    }
  };

  const getStatusBadgeColor = (status: UserStatus) => {
    switch (status) {
      case UserStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
      case UserStatus.INACTIVE:
        return 'bg-yellow-100 text-yellow-800';
      case UserStatus.SUSPENDED:
        return 'bg-red-100 text-red-800';
      case UserStatus.PENDING:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: UserStatus) => {
    switch (status) {
      case UserStatus.ACTIVE:
        return '활성';
      case UserStatus.INACTIVE:
        return '비활성';
      case UserStatus.SUSPENDED:
        return '정지';
      case UserStatus.PENDING:
        return '대기';
      default:
        return status;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {/* 헤더 섹션 */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center">
          <div className="relative w-20 h-20 mr-4">
            {user.profile.avatar ? (
              <Image
                src={user.profile.avatar}
                alt={user.name}
                fill
                className="rounded-full object-cover"
              />
            ) : (
              <UserCircleIcon className="w-20 h-20 text-gray-400" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{user.name}</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                {getRoleLabel(user.role)}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(user.status)}`}>
                {getStatusLabel(user.status)}
              </span>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        {mode === 'mypage' && editable && (
          <button
            onClick={onEdit}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            수정
          </button>
        )}
      </div>

      {/* 정보 섹션 */}
      <div className="space-y-3 border-t pt-4">
        {user.profile.company && (
          <div className="flex items-center text-sm">
            <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-3" />
            <span className="text-gray-600">회사:</span>
            <span className="ml-2 text-gray-900 font-medium">{user.profile.company}</span>
          </div>
        )}

        {user.profile.position && (
          <div className="flex items-center text-sm">
            <BriefcaseIcon className="h-5 w-5 text-gray-400 mr-3" />
            <span className="text-gray-600">직책:</span>
            <span className="ml-2 text-gray-900 font-medium">{user.profile.position}</span>
          </div>
        )}

        {user.profile.phone && (
          <div className="flex items-center text-sm">
            <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
            <span className="text-gray-600">연락처:</span>
            <span className="ml-2 text-gray-900 font-medium">{user.profile.phone}</span>
          </div>
        )}

        {user.profile.address && (
          <div className="flex items-start text-sm">
            <MapPinIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
            <div>
              <span className="text-gray-600">주소:</span>
              <span className="ml-2 text-gray-900">
                {user.profile.address.address1} {user.profile.address.address2}
              </span>
            </div>
          </div>
        )}

        {/* 전문가/심사관 전용 정보 */}
        {(user.role === UserRole.EXPERT || user.role === UserRole.EXAMINER) && (
          <>
            {user.profile.specialty && user.profile.specialty.length > 0 && (
              <div className="flex items-start text-sm">
                <CheckBadgeIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <span className="text-gray-600">전문분야:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {user.profile.specialty.map((spec, index) => (
                      <span key={index} className="inline-block px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {user.profile.experience && (
              <div className="flex items-center text-sm">
                <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-gray-600">경력:</span>
                <span className="ml-2 text-gray-900 font-medium">{user.profile.experience}년</span>
              </div>
            )}
          </>
        )}

        <div className="flex items-center text-sm">
          <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
          <span className="text-gray-600">가입일:</span>
          <span className="ml-2 text-gray-900">
            {(() => {
              const date = new Date(user.createdAt);
              return isNaN(date.getTime())
                ? '날짜 정보 없음'
                : date.toLocaleDateString('ko-KR');
            })()}
          </span>
        </div>

        {user.lastLoginAt && (
          <div className="flex items-center text-sm">
            <ArrowPathIcon className="h-5 w-5 text-gray-400 mr-3" />
            <span className="text-gray-600">최근 접속:</span>
            <span className="ml-2 text-gray-900">
              {(() => {
                const date = new Date(user.lastLoginAt);
                return isNaN(date.getTime())
                  ? '날짜 정보 없음'
                  : date.toLocaleDateString('ko-KR');
              })()}
            </span>
          </div>
        )}
      </div>

      {/* 관리자 모드 액션 버튼 */}
      {mode === 'admin' && (
        <div className="mt-6 pt-4 border-t space-y-2">
          <div className="flex gap-2">
            {onRoleChange && (
              <button
                onClick={() => {
                  setShowRoleModal(true);
                  fetchExaminersAndExperts();
                }}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                등급 변경
              </button>
            )}
            {onStatusChange && (
              <button
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                상태 변경
              </button>
            )}
          </div>

          {/* 관리자 승격/회수 버튼 */}
          {user.role === UserRole.EXAMINER && onUpgradeToAdmin && (
            <button
              onClick={() => onUpgradeToAdmin(user.id)}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              관리자로 승격
            </button>
          )}
          {user.role === UserRole.ADMIN && onRevokeAdmin && (
            <button
              onClick={() => onRevokeAdmin(user.id)}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-orange-300 text-sm font-medium rounded-md text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              관리자 권한 회수
            </button>
          )}
        </div>
      )}

      {/* 등급 변경 모달 */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowRoleModal(false)} />

            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">회원 등급 변경</h3>

              <div className="space-y-3">
                <p className="text-sm text-gray-900">
                  현재 등급: <span className="font-medium">{getRoleLabel(user.role)}</span>
                </p>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-900">변경할 등급</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                    value={selectedRole || user.role}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  >
                    <option value={UserRole.USER}>일반회원</option>
                    <option value={UserRole.EXAMINER}>기업심사관</option>
                    <option value={UserRole.EXPERT}>전문가</option>
                    {mode === 'admin' && user.role === UserRole.ADMIN && (
                      <option value={UserRole.ADMIN}>관리자</option>
                    )}
                  </select>
                </div>

                {selectedRole === UserRole.EXAMINER && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-900">심사관 선택</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                      value={selectedExaminerId}
                      onChange={(e) => setSelectedExaminerId(e.target.value)}
                    >
                      <option value="">심사관을 선택하세요</option>
                      {examiners.map((examiner) => (
                        <option key={examiner._id} value={examiner._id}>
                          {examiner.name} - {examiner.companyName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedRole === UserRole.EXPERT && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-900">전문가 선택</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                      value={selectedExpertId}
                      onChange={(e) => setSelectedExpertId(e.target.value)}
                    >
                      <option value="">전문가를 선택하세요</option>
                      {experts.map((expert) => (
                        <option key={expert._id} value={expert._id}>
                          {expert.name} - {expert.companyName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => {
                    setShowRoleModal(false);
                    setSelectedRole(null);
                    setSelectedExaminerId('');
                    setSelectedExpertId('');
                  }}
                  className="flex-1 inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleRoleChangeSubmit}
                  className="flex-1 inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  변경
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}