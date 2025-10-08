'use client';

import { useState, useEffect } from 'react';
import DataTable, { Column } from '@/components/admin/common/DataTable';
import ProfileCard from '@/components/profile/ProfileCard';
import { User, UserRole, UserStatus } from '@/types/user.types';
import {
  UserGroupIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

// 빈 초기 데이터 (실제 DB에서 로드)
const initialUsers: User[] = [];

interface Examiner {
  _id: string;
  name: string;
  position: string;
  companyName: string;
  userId?: string;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [examinerModalUser, setExaminerModalUser] = useState<User | null>(null);
  const [examinerAction, setExaminerAction] = useState<'create' | 'link'>('create');
  const [examiners, setExaminers] = useState<Examiner[]>([]);
  const [selectedExaminerId, setSelectedExaminerId] = useState<string>('');
  const [examinerFormData, setExaminerFormData] = useState({
    name: '',
    position: '인증 기업심사관',
    companyName: '',
    category: 'funding',
    specialties: [] as string[],
    isPublished: true
  });

  // 실제 사용자 데이터 로드
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        // API 응답에서 users 배열 추출
        const userList = data.users || data;
        // DB 데이터를 User 타입으로 변환
        const formattedUsers = (Array.isArray(userList) ? userList : []).map((user: any) => ({
          id: user._id || user.id,
          email: user.email,
          name: user.name || '사용자',
          role: user.role || UserRole.USER,
          status: user.status || UserStatus.ACTIVE,
          provider: user.provider || 'naver',
          profile: user.profile || {},
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
          lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : undefined
        }));
        setUsers(formattedUsers);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return '관리자';
      case UserRole.EXAMINER: return '기업심사관';
      case UserRole.EXPERT: return '전문가';
      case UserRole.USER: return '일반회원';
      default: return role;
    }
  };

  const getStatusLabel = (status: UserStatus) => {
    switch (status) {
      case UserStatus.ACTIVE: return '활성';
      case UserStatus.INACTIVE: return '비활성';
      case UserStatus.SUSPENDED: return '정지';
      case UserStatus.PENDING: return '대기';
      default: return status;
    }
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      label: '이름',
      sortable: true,
      render: (user) => (
        <div className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0">
            <UserGroupIcon className="h-10 w-10 text-gray-400" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{user.name}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'profile.company',
      label: '회사',
      sortable: true,
      render: (user) => user.profile.company || '-'
    },
    {
      key: 'role',
      label: '등급',
      sortable: true,
      render: (user) => {
        const roleColors = {
          [UserRole.ADMIN]: 'bg-red-100 text-red-800',
          [UserRole.EXAMINER]: 'bg-purple-100 text-purple-800',
          [UserRole.EXPERT]: 'bg-blue-100 text-blue-800',
          [UserRole.USER]: 'bg-gray-100 text-gray-800'
        };
        return (
          <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${roleColors[user.role]}`}>
            {getRoleLabel(user.role)}
          </span>
        );
      }
    },
    {
      key: 'status',
      label: '상태',
      sortable: true,
      render: (user) => {
        const statusColors = {
          [UserStatus.ACTIVE]: 'bg-green-100 text-green-800',
          [UserStatus.INACTIVE]: 'bg-yellow-100 text-yellow-800',
          [UserStatus.SUSPENDED]: 'bg-red-100 text-red-800',
          [UserStatus.PENDING]: 'bg-orange-100 text-orange-800'
        };
        return (
          <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${statusColors[user.status]}`}>
            {getStatusLabel(user.status)}
          </span>
        );
      }
    },
    {
      key: 'createdAt',
      label: '가입일',
      sortable: true,
      render: (user) => new Date(user.createdAt).toLocaleDateString('ko-KR')
    },
    {
      key: 'lastLoginAt',
      label: '최근 접속',
      sortable: true,
      render: (user) => user.lastLoginAt
        ? new Date(user.lastLoginAt).toLocaleDateString('ko-KR')
        : '-'
    }
  ];

  // 필터링된 데이터
  const filteredUsers = users.filter(user => {
    if (filterRole !== 'all' && user.role !== filterRole) return false;
    if (filterStatus !== 'all' && user.status !== filterStatus) return false;
    return true;
  });

  // 심사관 목록 가져오기
  useEffect(() => {
    if (examinerModalUser) {
      fetchExaminers();
      // 사용자 정보로 폼 초기화
      setExaminerFormData({
        name: examinerModalUser.name,
        position: '인증 기업심사관',
        companyName: examinerModalUser.profile?.company || '',
        category: 'funding',
        specialties: examinerModalUser.profile?.specialty || [],
        isPublished: true
      });
    }
  }, [examinerModalUser]);

  const fetchExaminers = async () => {
    try {
      console.log('[fetchExaminers] Fetching examiners...');
      const response = await fetch('/api/admin/examiners');
      console.log('[fetchExaminers] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[fetchExaminers] Received data:', data);
        console.log('[fetchExaminers] Examiners count:', data.examiners?.length || 0);
        setExaminers(data.examiners || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[fetchExaminers] Failed:', response.status, errorData);
        alert(`심사관 목록을 불러오는데 실패했습니다: ${errorData.error || response.status}`);
      }
    } catch (error) {
      console.error('[fetchExaminers] Error:', error);
      alert('심사관 목록을 불러오는 중 오류가 발생했습니다.');
    }
  };

  const handleRoleChangeSubmit = async (userId: string, newRole: UserRole) => {
    try {
      let requestBody: any = {
        newRole,
        profileData: {}
      };

      // 기업심사관으로 변경 시
      if (newRole === UserRole.EXAMINER) {
        requestBody.examinerAction = {
          action: examinerAction,
          ...(examinerAction === 'link' && { examinerId: selectedExaminerId }),
        };
        requestBody.profileData = examinerAction === 'create' ? examinerFormData : {};
      }

      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        fetchUsers(); // 목록 새로고침
        setExaminerModalUser(null);
        setSelectedExaminerId('');
        setExaminerAction('create');
      } else {
        alert(data.error || '역할 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to change role:', error);
      alert('역할 변경 중 오류가 발생했습니다.');
    }
  };

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setUsers(users.map(user =>
      user.id === userId ? { ...user, role: newRole } : user
    ));
    // API 호출 추가 필요
    console.log(`Changed user ${userId} role to ${newRole}`);
  };

  const handleStatusChange = (userId: string, newStatus: UserStatus) => {
    setUsers(users.map(user =>
      user.id === userId ? { ...user, status: newStatus } : user
    ));
    // API 호출 추가 필요
    console.log(`Changed user ${userId} status to ${newStatus}`);
  };

  const handleExport = () => {
    // 엑셀 다운로드 로직 추가 필요
    console.log('Exporting users to Excel...');
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">회원 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            전체 회원 {users.length}명 | 활성 {users.filter(u => u.status === UserStatus.ACTIVE).length}명
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {viewMode === 'table' ? '카드 보기' : '테이블 보기'}
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            엑셀 다운로드
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">필터:</span>
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">모든 등급</option>
            <option value={UserRole.ADMIN}>관리자</option>
            <option value={UserRole.EXAMINER}>기업심사관</option>
            <option value={UserRole.EXPERT}>전문가</option>
            <option value={UserRole.USER}>일반회원</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">모든 상태</option>
            <option value={UserStatus.ACTIVE}>활성</option>
            <option value={UserStatus.INACTIVE}>비활성</option>
            <option value={UserStatus.SUSPENDED}>정지</option>
            <option value={UserStatus.PENDING}>대기</option>
          </select>

          <div className="ml-auto text-sm text-gray-500">
            {filteredUsers.length}명 검색됨
          </div>
        </div>
      </div>

      {/* 승격 대기 알림 */}
      {users.filter(u => u.status === UserStatus.PENDING).length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <span className="font-medium">승인 대기 중인 회원이 {users.filter(u => u.status === UserStatus.PENDING).length}명 있습니다.</span>
                {' '}회원 정보를 검토하고 등급을 부여해주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 데이터 표시 */}
      {viewMode === 'table' ? (
        <DataTable
          data={filteredUsers}
          columns={columns}
          onRowClick={(user) => setSelectedUser(user)}
          searchPlaceholder="이름, 이메일, 회사 검색..."
          actions={(user) => (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setViewingUser(user);
                  setShowDetailModal(true);
                }}
                className="text-gray-600 hover:text-gray-900"
                title="상세보기"
              >
                <EyeIcon className="w-5 h-5" />
              </button>
              {user.role !== UserRole.ADMIN && user.role !== 'super_admin' && (
                <button
                  onClick={() => {
                    if (confirm(`${user.name}님을 관리자로 지정하시겠습니까?`)) {
                      handleRoleChangeSubmit(user.id, UserRole.ADMIN);
                    }
                  }}
                  className="text-red-600 hover:text-red-900 text-sm font-medium"
                >
                  관리자 지정
                </button>
              )}
              {user.role !== UserRole.EXAMINER && (
                <button
                  onClick={() => setExaminerModalUser(user)}
                  className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                >
                  심사관 지정
                </button>
              )}
            </div>
          )}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <ProfileCard
              key={user.id}
              user={user}
              mode="admin"
              onRoleChange={(newRole) => handleRoleChange(user.id, newRole)}
              onStatusChange={(newStatus) => handleStatusChange(user.id, newStatus)}
            />
          ))}
        </div>
      )}

      {/* 선택된 사용자 모달 */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setSelectedUser(null)}
            />
            <div className="relative bg-white rounded-lg max-w-2xl w-full p-6">
              <ProfileCard
                user={selectedUser}
                mode="admin"
                onRoleChange={(newRole) => {
                  handleRoleChange(selectedUser.id, newRole);
                  setSelectedUser(null);
                }}
                onStatusChange={(newStatus) => {
                  handleStatusChange(selectedUser.id, newStatus);
                  setSelectedUser(null);
                }}
              />
              <button
                onClick={() => setSelectedUser(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 심사관 지정 모달 */}
      {examinerModalUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setExaminerModalUser(null)}
            />
            <div className="relative bg-white rounded-lg max-w-3xl w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                기업심사관 지정
              </h2>
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>{examinerModalUser.name}</strong> ({examinerModalUser.email})님을 기업심사관으로 지정합니다.
                </p>
              </div>

              <div className="space-y-4">
                {/* 액션 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    심사관 프로필 설정
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="create"
                        checked={examinerAction === 'create'}
                        onChange={() => setExaminerAction('create')}
                        className="mr-2"
                      />
                      <span className="text-sm">신규 프로필 생성</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="link"
                        checked={examinerAction === 'link'}
                        onChange={() => setExaminerAction('link')}
                        className="mr-2"
                      />
                      <span className="text-sm">기존 심사관과 연결</span>
                    </label>
                  </div>
                </div>

                {/* 신규 생성 폼 */}
                {examinerAction === 'create' && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        이름
                      </label>
                      <input
                        type="text"
                        value={examinerFormData.name}
                        onChange={(e) => setExaminerFormData({...examinerFormData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        직책
                      </label>
                      <input
                        type="text"
                        value={examinerFormData.position}
                        onChange={(e) => setExaminerFormData({...examinerFormData, position: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        회사명
                      </label>
                      <input
                        type="text"
                        value={examinerFormData.companyName}
                        onChange={(e) => setExaminerFormData({...examinerFormData, companyName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        카테고리
                      </label>
                      <select
                        value={examinerFormData.category}
                        onChange={(e) => setExaminerFormData({...examinerFormData, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="funding">자금</option>
                        <option value="tax">세무</option>
                        <option value="legal">법무</option>
                        <option value="hr">노무</option>
                        <option value="marketing">마케팅</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* 기존 심사관 연결 */}
                {examinerAction === 'link' && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      연결할 심사관 선택
                    </label>
                    <select
                      value={selectedExaminerId}
                      onChange={(e) => setSelectedExaminerId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">선택하세요 (전체 {examiners.length}명)</option>
                      {examiners.map((examiner) => (
                        <option
                          key={examiner._id}
                          value={examiner._id}
                          disabled={!!examiner.userId}
                        >
                          {examiner.name} - {examiner.position} ({examiner.companyName})
                          {examiner.userId ? ' [이미 연결됨]' : ''}
                        </option>
                      ))}
                    </select>
                    {examiners.filter(e => !e.userId).length === 0 && examiners.length > 0 && (
                      <p className="mt-2 text-sm text-amber-600">
                        ⚠️ 모든 심사관이 이미 사용자와 연결되어 있습니다.
                      </p>
                    )}
                    {examiners.length === 0 && (
                      <p className="mt-2 text-sm text-red-600">
                        ❌ 등록된 심사관이 없습니다.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setExaminerModalUser(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  취소
                </button>
                <button
                  onClick={() => handleRoleChangeSubmit(examinerModalUser.id, UserRole.EXAMINER)}
                  disabled={examinerAction === 'link' && !selectedExaminerId}
                  className="px-4 py-2 text-sm text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-gray-400"
                >
                  심사관 지정하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 사용자 상세보기 모달 */}
      {showDetailModal && viewingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">사용자 상세 정보</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* 기본 정보 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">이름</label>
                      <p className="text-base font-semibold text-gray-900">{viewingUser.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">이메일</label>
                      <p className="text-base text-gray-900">{viewingUser.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">전화번호</label>
                      <p className="text-base text-gray-900">{viewingUser.profile.phone || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">회사</label>
                      <p className="text-base text-gray-900">{viewingUser.profile.company || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* 계정 정보 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">계정 정보</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">등급</label>
                      <p className="text-base">
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                          viewingUser.role === UserRole.ADMIN ? 'bg-red-100 text-red-800' :
                          viewingUser.role === UserRole.EXAMINER ? 'bg-purple-100 text-purple-800' :
                          viewingUser.role === UserRole.EXPERT ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {getRoleLabel(viewingUser.role)}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">상태</label>
                      <p className="text-base">
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                          viewingUser.status === UserStatus.ACTIVE ? 'bg-green-100 text-green-800' :
                          viewingUser.status === UserStatus.INACTIVE ? 'bg-yellow-100 text-yellow-800' :
                          viewingUser.status === UserStatus.SUSPENDED ? 'bg-red-100 text-red-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {getStatusLabel(viewingUser.status)}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">가입일</label>
                      <p className="text-base text-gray-900">
                        {new Date(viewingUser.createdAt).toLocaleString('ko-KR')}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">최근 접속</label>
                      <p className="text-base text-gray-900">
                        {viewingUser.lastLoginAt
                          ? new Date(viewingUser.lastLoginAt).toLocaleString('ko-KR')
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 전문 분야 */}
                {viewingUser.profile.specialty && viewingUser.profile.specialty.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">전문 분야</h3>
                    <div className="flex flex-wrap gap-2">
                      {viewingUser.profile.specialty.map((spec, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 기업심사관 정보 */}
                {viewingUser.role === UserRole.EXAMINER && viewingUser.examinerId && (
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h3 className="text-lg font-semibold text-purple-900 mb-3">심사관 정보</h3>
                    <div className="text-sm text-purple-800">
                      <p>심사관 ID: {viewingUser.examinerId}</p>
                    </div>
                  </div>
                )}

                {/* 배정된 상담 */}
                {viewingUser.assignedConsultations !== undefined && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">활동 통계</h3>
                    <p className="text-sm text-blue-800">
                      배정된 상담: <span className="font-semibold">{viewingUser.assignedConsultations}건</span>
                    </p>
                  </div>
                )}
              </div>

              {/* 닫기 버튼 */}
              <div className="flex justify-end pt-6 border-t mt-6">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}