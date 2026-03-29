'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import './page.css';

/**
 * 전문가 관리 페이지
 * @purpose 관리자가 전문가 프로필 수정, 계정 연결, 이미지 업로드 관리
 * @context 전문가 카드에서 수정 클릭 시 모달로 편집
 */

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
  imageUrl?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

// 편집 폼 데이터 타입
interface EditFormData {
  name: string;
  position: string;
  companyName: string;
  email: string;
  specialties: string;
  introduction: string;
  imageUrl: string;
}

export default function AdminExpertsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [experts, setExperts] = useState<Expert[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 계정 연결 모달
  const [linkExpert, setLinkExpert] = useState<Expert | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // 편집 모달
  const [editExpert, setEditExpert] = useState<Expert | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({
    name: '',
    position: '',
    companyName: '',
    email: '',
    specialties: '',
    introduction: '',
    imageUrl: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const expertsRes = await fetch('/api/admin/experts');
      const expertsData = await expertsRes.json();

      if (expertsData.success) {
        setExperts(expertsData.experts);
      }

      const usersRes = await fetch('/api/admin/users');
      const usersData = await usersRes.json();

      if (usersData.success !== undefined ? usersData.success : usersData.users) {
        setUsers(usersData.users || []);
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
        body: JSON.stringify({ expertId, userId }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: '전문가 계정이 연결되었습니다.' });
        fetchData();
        setLinkExpert(null);
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
        body: JSON.stringify({ expertId, isActive: !isActive }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: `전문가가 ${!isActive ? '활성화' : '비활성화'}되었습니다.`,
        });
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || '상태 변경에 실패했습니다.' });
      }
    } catch (error) {
      console.error('Failed to toggle active:', error);
      setMessage({ type: 'error', text: '상태 변경 중 오류가 발생했습니다.' });
    }
  };

  /** 편집 모달 열기 */
  const openEditModal = (expert: Expert) => {
    setEditExpert(expert);
    setEditForm({
      name: expert.name || '',
      position: expert.position || '',
      companyName: expert.companyName || '',
      email: expert.email || '',
      specialties: expert.specialties?.join(', ') || '',
      introduction: expert.introduction || '',
      imageUrl: expert.imageUrl || '',
    });
    setImagePreview(expert.imageUrl || '');
  };

  /** 편집 모달 닫기 */
  const closeEditModal = () => {
    setEditExpert(null);
    setImagePreview('');
    setIsSaving(false);
    setIsUploading(false);
  };

  /** 이미지 업로드 */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 미리보기
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    // 서버 업로드
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.url) {
        setEditForm((prev) => ({ ...prev, imageUrl: data.url }));
        setImagePreview(data.url);
        setMessage({ type: 'success', text: '이미지가 업로드되었습니다.' });
      } else {
        setMessage({ type: 'error', text: data.error || '이미지 업로드에 실패했습니다.' });
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      setMessage({ type: 'error', text: '이미지 업로드 중 오류가 발생했습니다.' });
    } finally {
      setIsUploading(false);
    }
  };

  /** 전문가 정보 저장 */
  const handleSaveExpert = async () => {
    if (!editExpert) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/experts/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expertId: editExpert._id,
          name: editForm.name,
          position: editForm.position,
          companyName: editForm.companyName,
          email: editForm.email,
          specialties: editForm.specialties
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          introduction: editForm.introduction,
          imageUrl: editForm.imageUrl,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: '전문가 정보가 수정되었습니다.' });
        fetchData();
        closeEditModal();
      } else {
        setMessage({ type: 'error', text: data.error || '수정에 실패했습니다.' });
      }
    } catch (error) {
      console.error('Failed to update expert:', error);
      setMessage({ type: 'error', text: '수정 중 오류가 발생했습니다.' });
    } finally {
      setIsSaving(false);
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
            <i
              className={`fas fa-${message.type === 'success' ? 'check-circle' : 'exclamation-circle'}`}
            />
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="btn-close">
              <i className="fas fa-times" />
            </button>
          </div>
        )}

        <div className="experts-grid">
          {experts.map((expert) => {
            const linkedUser = users.find((u) => {
              if (!expert.userId) return false;
              const userId = typeof u._id === 'string' ? u._id : u._id?.toString();
              return userId === expert.userId;
            });

            return (
              <div key={expert._id} className={`expert-card ${!expert.isActive ? 'inactive' : ''}`}>
                <div className="expert-card-header">
                  <div className="expert-card-header-info">
                    {expert.imageUrl && (
                      <img
                        src={expert.imageUrl}
                        alt={expert.name}
                        className="expert-card-thumbnail"
                      />
                    )}
                    <div>
                      <h3>{expert.name}</h3>
                      <p className="expert-position">{expert.position}</p>
                      <p className="expert-company">{expert.companyName}</p>
                    </div>
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
                  <button onClick={() => openEditModal(expert)} className="btn-edit">
                    <i className="fas fa-pen" />
                    수정
                  </button>

                  {linkedUser ? (
                    <button
                      onClick={() => {
                        setLinkExpert(expert);
                        setSelectedUserId(linkedUser._id);
                      }}
                      className="btn-connect"
                    >
                      <i className="fas fa-exchange-alt" />
                      계정 변경
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setLinkExpert(expert);
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
                    보기
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 전문가 편집 모달 */}
      {editExpert && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editExpert.name} - 정보 수정</h2>
              <button onClick={closeEditModal} className="btn-close-modal">
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="modal-body">
              {/* 이미지 업로드 */}
              <div className="edit-image-section">
                <div className="edit-image-preview" onClick={() => fileInputRef.current?.click()}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="미리보기" />
                  ) : (
                    <div className="edit-image-placeholder">
                      <i className="fas fa-camera" />
                      <span>이미지 업로드</span>
                    </div>
                  )}
                  {isUploading && (
                    <div className="edit-image-uploading">
                      <div className="spinner" />
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="btn-upload-image"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <i className="fas fa-upload" />
                  {isUploading ? '업로드 중...' : '이미지 변경'}
                </button>
              </div>

              {/* 기본 정보 폼 */}
              <div className="edit-form-grid">
                <div className="edit-form-field">
                  <label>이름</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="edit-form-field">
                  <label>직책</label>
                  <input
                    type="text"
                    value={editForm.position}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, position: e.target.value }))}
                  />
                </div>

                <div className="edit-form-field">
                  <label>회사명</label>
                  <input
                    type="text"
                    value={editForm.companyName}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, companyName: e.target.value }))
                    }
                  />
                </div>

                <div className="edit-form-field">
                  <label>이메일</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                <div className="edit-form-field full-width">
                  <label>전문 분야 (쉼표로 구분)</label>
                  <input
                    type="text"
                    value={editForm.specialties}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, specialties: e.target.value }))
                    }
                    placeholder="정책자금, 경영컨설팅, 세무"
                  />
                </div>

                <div className="edit-form-field full-width">
                  <label>소개</label>
                  <textarea
                    value={editForm.introduction}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, introduction: e.target.value }))
                    }
                    rows={3}
                    placeholder="전문가 소개를 입력하세요"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button onClick={closeEditModal} className="btn-cancel">
                  취소
                </button>
                <button
                  onClick={handleSaveExpert}
                  className="btn-confirm"
                  disabled={isSaving || isUploading}
                >
                  <i className="fas fa-check" />
                  {isSaving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 사용자 연결 모달 */}
      {linkExpert && (
        <div className="modal-overlay" onClick={() => setLinkExpert(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{linkExpert.name} - 계정 연결</h2>
              <button onClick={() => setLinkExpert(null)} className="btn-close-modal">
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
                <button onClick={() => setLinkExpert(null)} className="btn-cancel">
                  취소
                </button>
                <button
                  onClick={() => {
                    if (selectedUserId) {
                      handleAssignUser(linkExpert._id, selectedUserId);
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
