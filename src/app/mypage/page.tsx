'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ProfileCard from '@/components/profile/ProfileCard';
import ProfileEditModal from './ProfileEditModal';
import { User, UserRole, UserStatus, isProfileComplete } from '@/types/user.types';
import { UserActivity, UserStats, ActivityType, ContentType, ReactionType } from '@/types/activity.types';
import {
  UserCircleIcon,
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  CalendarIcon,
  ClockIcon,
  ChatBubbleLeftIcon,
  PencilSquareIcon,
  HeartIcon,
  HandThumbUpIcon,
  EyeIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { signOut } from 'next-auth/react';

export default function MyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'activity' | 'stats' | 'settings'>('profile');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'all' | ActivityType>('all');
  const [showProfileAlert, setShowProfileAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<UserActivity[]>([]);

  // 로그인 체크 및 사용자 정보 설정
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/auth/login?redirect=/mypage');
      return;
    }

    if (status === 'authenticated' && session?.user) {
      const userId = session.user.email || '';

      // DB에서 사용자 정보 가져오기
      fetchUserData(userId);
    }
  }, [status, session, router]);

  // 사용자 데이터 가져오기
  const fetchUserData = async (userId: string) => {
    try {
      // 사용자 정보 가져오기
      const userResponse = await fetch(`/api/users/${userId}`);
      const userData = await userResponse.json();

      if (userData.error) {
        // 에러 처리
        console.error('Failed to fetch user data:', userData.error);
        // 세션 정보로 fallback
        const sessionUser: User = {
          id: session?.user?.email || '',
          email: session?.user?.email || '',
          name: session?.user?.name || '사용자',
          image: session?.user?.image || undefined,
          role: (session?.user as any)?.role || UserRole.USER,
          status: UserStatus.ACTIVE,
          provider: (session?.user as any)?.provider || 'naver',
          profile: {
            phone: (session?.user as any)?.mobile || '',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date()
        };
        setUser(sessionUser);
      } else {
        // DB에서 가져온 데이터 사용
        const user: User = {
          id: userData._id || userData.email,
          email: userData.email,
          name: userData.name || '사용자',
          image: userData.image,
          role: userData.role || UserRole.USER,
          status: UserStatus.ACTIVE,
          provider: userData.provider || 'naver',
          profile: userData.profile || {},
          createdAt: new Date(userData.createdAt),
          updatedAt: new Date(userData.updatedAt),
          lastLoginAt: new Date(userData.lastLoginAt)
        };
        setUser(user);
        setShowProfileAlert(!isProfileComplete(user.profile));
      }

      // 통계 및 활동 데이터 가져오기
      fetchUserStats(userId);
      fetchUserActivities(userId);

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      setIsLoading(false);
    }
  };

  // 사용자 통계 데이터 가져오기
  const fetchUserStats = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/stats`);
      const data = await response.json();

      if (!data.error) {
        setUserStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
      // 에러 시 기본값 설정
      setUserStats({
        totalPosts: 0,
        totalComments: 0,
        totalReactions: 0,
        totalViews: 0,
        reactions: {
          likes: 0,
          helpfuls: 0,
          empathies: 0
        },
        contentStats: {
          [ContentType.POLICY_NEWS]: {
            posts: 0,
            comments: 0,
            reactions: 0,
            views: 0
          },
          [ContentType.BUSINESS_VOICE]: {
            posts: 0,
            comments: 0,
            reactions: 0,
            views: 0
          },
          [ContentType.TTONTOK]: {
            posts: 0,
            comments: 0,
            reactions: 0,
            views: 0
          }
        },
        activityByPeriod: {
          today: 0,
          thisWeek: 0,
          thisMonth: 0,
          total: 0
        },
        activityScore: 0,
        level: 1,
        nextLevelProgress: 0
      });
    }
  };

  // 사용자 활동 데이터 가져오기
  const fetchUserActivities = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/activities`);
      const data = await response.json();

      if (!data.error) {
        setRecentActivities(data);
      }
    } catch (error) {
      console.error('Failed to fetch user activities:', error);
      setRecentActivities([]);
    }
  };

  const handleEditProfile = () => {
    setIsEditModalOpen(true);
  };

  const handleProfileUpdate = async (updatedProfile: any) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/users/${user.email}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProfile)
      });

      const data = await response.json();

      if (!data.error) {
        const updatedUser: User = {
          id: data._id || data.email,
          email: data.email,
          name: data.name || '사용자',
          image: data.image,
          role: data.role || UserRole.USER,
          status: UserStatus.ACTIVE,
          provider: data.provider || 'naver',
          profile: data.profile || {},
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
          lastLoginAt: new Date(data.lastLoginAt)
        };

        setUser(updatedUser);
        setIsEditModalOpen(false);
        setShowProfileAlert(!isProfileComplete(updatedUser.profile));
      } else {
        console.error('Failed to update profile:', data.error);
        alert('프로필 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('프로필 업데이트 중 오류가 발생했습니다.');
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  // 활동 필터링
  const filteredActivities = recentActivities.filter(activity =>
    activityFilter === 'all' || activity.activityType === activityFilter
  );

  // 로딩 중
  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 프로필 미완성 알림 */}
        {showProfileAlert && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">프로필을 완성해주세요</h3>
              <p className="mt-1 text-sm text-yellow-600">
                프로필 정보를 모두 입력하시면 더 많은 기능을 이용하실 수 있습니다.
              </p>
            </div>
            <button
              onClick={handleEditProfile}
              className="ml-4 text-sm font-medium text-yellow-700 hover:text-yellow-800"
            >
              지금 완성하기
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* 왼쪽 사이드바 - 프로필 카드 및 메뉴 */}
          <div className="lg:w-1/3">
            <ProfileCard
              user={user}
              isEditable={true}
              onEdit={handleEditProfile}
              showDetails={true}
            />

            {/* 메뉴 탭 */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border">
              <nav className="space-y-1 p-2">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'profile'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <UserCircleIcon className="h-5 w-5 mr-3" />
                  프로필
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'activity'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ClockIcon className="h-5 w-5 mr-3" />
                  활동 내역
                </button>
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'stats'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ChartBarIcon className="h-5 w-5 mr-3" />
                  통계
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'settings'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <CogIcon className="h-5 w-5 mr-3" />
                  설정
                </button>
                <hr className="my-2 border-gray-200" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-red-600 hover:bg-red-50 transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
                  로그아웃
                </button>
              </nav>
            </div>
          </div>

          {/* 오른쪽 메인 컨텐츠 */}
          <div className="lg:w-2/3">
            {/* 프로필 탭 */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">내 프로필</h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">기본 정보</h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm text-gray-500">이름</dt>
                        <dd className="mt-1 text-sm font-medium text-gray-900">{user.name}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">이메일</dt>
                        <dd className="mt-1 text-sm font-medium text-gray-900">{user.email}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">전화번호</dt>
                        <dd className="mt-1 text-sm font-medium text-gray-900">
                          {user.profile?.phone || '미입력'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">로그인 계정</dt>
                        <dd className="mt-1 text-sm font-medium text-gray-900">
                          {user.provider === 'naver' ? '네이버' : user.provider === 'kakao' ? '카카오' : user.provider}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {user.profile?.company && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">회사 정보</h3>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm text-gray-500">회사명</dt>
                          <dd className="mt-1 text-sm font-medium text-gray-900">{user.profile.company}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-gray-500">직책</dt>
                          <dd className="mt-1 text-sm font-medium text-gray-900">{user.profile.position || '미입력'}</dd>
                        </div>
                      </dl>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 활동 내역 탭 */}
            {activeTab === 'activity' && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">활동 내역</h2>
                  <select
                    value={activityFilter}
                    onChange={(e) => setActivityFilter(e.target.value as any)}
                    className="text-sm border-gray-300 rounded-md"
                  >
                    <option value="all">전체</option>
                    <option value={ActivityType.POST}>작성글</option>
                    <option value={ActivityType.COMMENT}>댓글</option>
                    <option value={ActivityType.REACTION}>반응</option>
                    <option value={ActivityType.VIEW}>조회</option>
                  </select>
                </div>

                {filteredActivities.length === 0 ? (
                  <div className="text-center py-12">
                    <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">활동 내역이 없습니다</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      커뮤니티 활동을 시작해보세요!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredActivities.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b last:border-0">
                        <div className="flex-shrink-0">
                          {activity.activityType === ActivityType.POST && <PencilSquareIcon className="h-5 w-5 text-blue-500" />}
                          {activity.activityType === ActivityType.COMMENT && <ChatBubbleLeftIcon className="h-5 w-5 text-green-500" />}
                          {activity.activityType === ActivityType.REACTION && <HeartIcon className="h-5 w-5 text-red-500" />}
                          {activity.activityType === ActivityType.VIEW && <EyeIcon className="h-5 w-5 text-gray-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            {activity.contentTitle}
                          </p>
                          {activity.details?.comment && (
                            <p className="mt-1 text-sm text-gray-500">{activity.details.comment}</p>
                          )}
                          <p className="mt-1 text-xs text-gray-400">
                            {new Date(activity.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 통계 탭 */}
            {activeTab === 'stats' && userStats && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">활동 통계</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">총 작성글</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">{userStats.totalPosts}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">총 댓글</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">{userStats.totalComments}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">받은 반응</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">{userStats.totalReactions}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">총 조회수</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">{userStats.totalViews}</p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">레벨 정보</h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>레벨 {userStats.level}</span>
                        <span>{userStats.nextLevelProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${userStats.nextLevelProgress}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">활동 점수</p>
                      <p className="text-lg font-semibold text-gray-900">{userStats.activityScore}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 설정 탭 */}
            {activeTab === 'settings' && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">계정 설정</h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">알림 설정</h3>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded text-blue-600" />
                        <span className="ml-2 text-sm text-gray-700">이메일 알림 받기</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded text-blue-600" />
                        <span className="ml-2 text-sm text-gray-700">문자 알림 받기</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">개인정보 보호</h3>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded text-blue-600" />
                        <span className="ml-2 text-sm text-gray-700">프로필 공개</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded text-blue-600" />
                        <span className="ml-2 text-sm text-gray-700">활동 내역 공개</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-6 border-t">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">계정 관리</h3>
                    <div className="space-y-3">
                      <div className="text-sm text-gray-500">
                        <p className="mb-2">
                          소셜 로그인으로 연결된 계정입니다.
                        </p>
                        <p>
                          비밀번호는 {user?.provider === 'naver' ? '네이버' : user?.provider === 'kakao' ? '카카오' : user?.provider}에서 관리됩니다.
                        </p>
                      </div>
                      <div className="text-sm text-red-600 mt-4">
                        <button className="hover:text-red-700">계정 탈퇴</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 프로필 수정 모달 */}
      {isEditModalOpen && (
        <ProfileEditModal
          user={user}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleProfileUpdate}
        />
      )}
    </div>
  );
}