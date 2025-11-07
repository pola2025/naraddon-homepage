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
  PlusIcon
} from '@heroicons/react/24/outline';

// 빈 초기 데이터 (실제 DB에서 로드)
const initialUsers: User[] = [];

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // 실제 사용자 데이터 로드
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/users');

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.message || 'Failed to fetch users');
      }

      const data = await response.json();
      console.log('[Users Page] API Response:', data);

      // API 응답 구조: { users: [...], total, limit, skip }
      const userList = data.users || [];

      // DB 데이터를 User 타입으로 변환
      const formattedUsers = userList.map((user: any) => ({
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

      console.log('[Users Page] Formatted users:', formattedUsers.length);
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      alert('사용자 목록을 불러오는데 실패했습니다. 콘솔을 확인해주세요.');
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

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      // API 호출하여 역할 변경
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newRole,
          profileData: {
            reason: '관리자가 역할 변경'
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to change role');
      }

      const result = await response.json();

      // 로컬 상태 업데이트
      setUsers(users.map(user =>
        user.id === userId ? { ...user, role: newRole } : user
      ));

      alert(`역할이 ${newRole}(으)로 변경되었습니다.`);
      console.log(`Changed user ${userId} role to ${newRole}`, result);

      // 사용자 목록 새로고침
      await fetchUsers();
    } catch (error: any) {
      console.error('Failed to change role:', error);
      alert(`역할 변경 실패: ${error.message}`);
    }
  };

  const handleStatusChange = (userId: string, newStatus: UserStatus) => {
    setUsers(users.map(user =>
      user.id === userId ? { ...user, status: newStatus } : user
    ));
    // API 호출 추가 필요
    console.log(`Changed user ${userId} status to ${newStatus}`);
  };

  // 관리자 권한 승격 (examiner → admin)
  const handleUpgradeToAdmin = async (userId: string) => {
    if (!confirm('이 사용자를 관리자로 승격하시겠습니까?')) {
      return;
    }

    const reason = prompt('승격 사유를 입력하세요:', '관리자 권한 부여');
    if (!reason) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason,
          permissions: ['admin_dashboard', 'user_management', 'consultation_management'],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upgrade to admin');
      }

      const result = await response.json();
      alert(`관리자로 승격되었습니다: ${result.message}`);

      // 사용자 목록 새로고침
      await fetchUsers();
    } catch (error: any) {
      console.error('Failed to upgrade to admin:', error);
      alert(`관리자 승격 실패: ${error.message}`);
    }
  };

  // 관리자 권한 회수 (admin → user)
  const handleRevokeAdmin = async (userId: string) => {
    if (!confirm('이 사용자의 관리자 권한을 회수하시겠습니까?')) {
      return;
    }

    const reason = prompt('회수 사유를 입력하세요:', '관리자 권한 해제');
    if (!reason) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}/upgrade`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to revoke admin');
      }

      const result = await response.json();
      alert(`관리자 권한이 회수되었습니다: ${result.message}`);

      // 사용자 목록 새로고침
      await fetchUsers();
    } catch (error: any) {
      console.error('Failed to revoke admin:', error);
      alert(`관리자 권한 회수 실패: ${error.message}`);
    }
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
          pageSize={100}
          actions={(user) => (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedUser(user)}
                className="text-purple-600 hover:text-purple-900 text-sm"
              >
                등급변경
              </button>
              {user.role === UserRole.EXAMINER && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpgradeToAdmin(user.id);
                  }}
                  className="text-red-600 hover:text-red-900 text-sm font-medium"
                  title="관리자로 승격"
                >
                  관리자승격
                </button>
              )}
              {user.role === UserRole.ADMIN && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRevokeAdmin(user.id);
                  }}
                  className="text-orange-600 hover:text-orange-900 text-sm font-medium"
                  title="관리자 권한 회수"
                >
                  권한회수
                </button>
              )}
              <button
                onClick={() => setSelectedUser(user)}
                className="text-blue-600 hover:text-blue-900 text-sm"
              >
                상세
              </button>
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
              onUpgradeToAdmin={handleUpgradeToAdmin}
              onRevokeAdmin={handleRevokeAdmin}
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
                onUpgradeToAdmin={(userId) => {
                  handleUpgradeToAdmin(userId);
                  setSelectedUser(null);
                }}
                onRevokeAdmin={(userId) => {
                  handleRevokeAdmin(userId);
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
    </div>
  );
}