'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import './page.css';

interface Expert {
  _id: string;
  name: string;
  position: string;
  companyName: string;
  email: string;
  userId?: string;
  isActive: boolean;
  specialties: string[];
  introduction: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminExpertsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [experts, setExperts] = useState<Expert[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // 관리자 권한 확인
  useEffect(() => {
    if (status === 'loading') return;

    if (!session || session.user.role !== 'admin') {
      router.push('/');
      return;
    }

    fetchData();
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      // 전문가 목록 조회
      const expertsRes = await fetch('/api/admin/experts');
      const expertsData = await expertsRes.json();

      if (expertsData.success) {
        setExperts(expertsData.experts);
      }

      // 사용자 목록 조회
      const usersRes = await fetch('/api/admin/users');
      const usersData = await usersRes.json();

      if (usersData.success) {
        setUsers(usersData.users);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setMessage({ type: 'error', text: '데이터를 불러올 수 없습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignUser = async (expertId: string, userId: string) => {
    try {
      const response = await fetch('/api/admin/experts/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertId, userId })
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: '전문가 계정이 연결되었습니다.' });
        fetchData(); // 목록 새로고침
        setSelectedExpert(null);
      } else {
        setMessage({ type: 'error', text: data.error || '연결에 실패했습니다.' });
      }
    } catch (error) {
      console.error('Failed to assign user:', error);
      setMessage({ type: 'error', text: '연결 중 오류가 발생했습니다.' });
    }
  };

  const handleToggleActive = async (expertId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/admin/experts/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertId, isActive: !isActive })
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: `전문가가 ${!isActive ? '활성화' : '비활성화'}되었습니다.` });
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || '상태 변경에 실패했습니다.' });
      }
    } catch (error) {
      console.error('Failed to toggle active:', error);
      setMessage({ type: 'error', text: '상태 변경 중 오류가 발생했습니다.' });
    }
  };

  if (isLoading) {
    return (
      <div className="admin-experts-page">
        <div className="loading-container">
          <div className="spinner" />
          <p>데이터를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-experts-page">
      <div className="admin-container">
        <header className="admin-header">
          <h1>전문가 관리</h1>
          <p>전문가와 사용자 계정을 연결하고 관리합니다</p>
        </header>

        {message && (
          <div className={`message ${message.type}`}>
            <i className={`fas fa-${message.type === 'success' ? 'check-circle' : 'exclamation-circle'}`} />
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="btn-close">
              <i className="fas fa-times" />
            </button>
          </div>
        )}

        <div className="experts-grid">
          {experts.map((expert) => {
            const linkedUser = users.find(u => u.id === expert.userId || u._id === expert.userId);

            return (
              <div key={expert._id} className={`expert-card ${!expert.isActive ? 'inactive' : ''}`}>
                <div className="expert-card-header">
                  <div>
                    <h3>{expert.name}</h3>
                    <p className="expert-position">{expert.position}</p>
                    <p className="expert-company">{expert.companyName}</p>
                  </div>
                  <button
                    onClick={() => handleToggleActive(expert._id, expert.isActive)}
                    className={`btn-toggle ${expert.isActive ? 'active' : ''}`}
                    title={expert.isActive ? '비활성화' : '활성화'}
                  >
                    <i className={`fas fa-${expert.isActive ? 'toggle-on' : 'toggle-off'}`} />
                  </button>
                </div>

                <div className="expert-card-body">
                  <div className="info-row">
                    <span className="label">이메일</span>
                    <span className="value">{expert.email || '미등록'}</span>
                  </div>

                  <div className="info-row">
                    <span className="label">전문 분야</span>
                    <span className="value">{expert.specialties?.join(', ') || '없음'}</span>
                  </div>

                  <div className="info-row">
                    <span className="label">연결된 계정</span>
                    <span className="value">
                      {linkedUser ? (
                        <span className="linked-user">
                          <i className="fas fa-user-check" />
                          {linkedUser.name} ({linkedUser.email})
                        </span>
                      ) : (
                        <span className="no-link">연결 안 됨</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="expert-card-actions">
                  {linkedUser ? (
                    <button
                      onClick={() => {
                        setSelectedExpert(expert);
                        setSelectedUserId(linkedUser._id);
                      }}
                      className="btn-edit"
                    >
                      <i className="fas fa-edit" />
                      계정 변경
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedExpert(expert);
                        setSelectedUserId('');
                      }}
                      className="btn-connect"
                    >
                      <i className="fas fa-link" />
                      계정 연결
                    </button>
                  )}

                  <a
                    href={`/expert-services/${expert._id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-view"
                  >
                    <i className="fas fa-external-link-alt" />
                    프로필 보기
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 사용자 연결 모달 */}
      {selectedExpert && (
        <div className="modal-overlay" onClick={() => setSelectedExpert(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedExpert.name} - 계정 연결</h2>
              <button onClick={() => setSelectedExpert(null)} className="btn-close-modal">
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-description">
                연결할 사용자 계정을 선택하세요. 선택한 사용자에게 expert 역할이 부여됩니다.
              </p>

              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="user-select"
              >
                <option value="">-- 사용자 선택 --</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name} ({user.email}) - {user.role}
                  </option>
                ))}
              </select>

              <div className="modal-actions">
                <button
                  onClick={() => setSelectedExpert(null)}
                  className="btn-cancel"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    if (selectedUserId) {
                      handleAssignUser(selectedExpert._id, selectedUserId);
                    }
                  }}
                  className="btn-confirm"
                  disabled={!selectedUserId}
                >
                  <i className="fas fa-check" />
                  연결하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
