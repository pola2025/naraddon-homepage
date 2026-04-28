'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import ExaminerBrandModal from '@/components/admin/experts/ExaminerBrandModal';
import './page.css';

/**
 * 전문가 통합 관리 페이지 (2026-04-28)
 *
 * @purpose 관리자가 한 화면에서 전문가 카드 + 계정 연결 + 회사정보(brandPage) 모두 관리
 * @context 통합 일원화 — 구 /admin/expert-services, /admin/expert-dashboards 흡수
 * @decision
 *   - Expert(서비스 카드) 모델 + ExpertExaminer(brandPage) 모델은 email 로 매칭
 *   - 카드 신규/편집/삭제 + 카드 이미지 업로드 (구 expert-services 기능)
 *   - "회사정보" 버튼으로 ExaminerBrandModal 열어 brandPage 편집 (5개 examiner Editor 재사용)
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
  cardImageUrl?: string;
  imageKey?: string;
  order?: number;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

/** examiner 매칭용 최소 정보 (전체 brandPage 는 모달이 fetch) */
interface ExaminerLite {
  _id: string;
  email?: string | null;
  name: string;
  companyName?: string;
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
  cardImageUrl: string;
  imageKey: string;
  order: number;
  isActive: boolean;
}

const EMPTY_EDIT_FORM: EditFormData = {
  name: '',
  position: '',
  companyName: '',
  email: '',
  specialties: '',
  introduction: '',
  imageUrl: '',
  cardImageUrl: '',
  imageKey: '',
  order: 0,
  isActive: true,
};

export default function AdminExpertsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [experts, setExperts] = useState<Expert[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [examiners, setExaminers] = useState<ExaminerLite[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 계정 연결 모달
  const [linkExpert, setLinkExpert] = useState<Expert | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // 편집/신규 모달 — editExpert 가 _id 빈 객체면 신규 등록
  const [editExpert, setEditExpert] = useState<Expert | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData>(EMPTY_EDIT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState<'profile' | 'card' | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [cardImagePreview, setCardImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardFileInputRef = useRef<HTMLInputElement>(null);

  // 회사정보(brandPage) 모달 상태
  const [brandModalExpert, setBrandModalExpert] = useState<Expert | null>(null);

  /**
   * 회사정보 모달용 examiner 매칭
   * @decision Expert.email ↔ ExpertExaminer.email 자동 매칭. 못 찾으면 모달이 안내 메시지 표시
   */
  const matchedExaminerForBrand = useMemo(() => {
    if (!brandModalExpert?.email) return null;
    return (
      examiners.find(
        (ex) => (ex.email || '').toLowerCase() === brandModalExpert.email.toLowerCase()
      ) || null
    );
  }, [brandModalExpert, examiners]);

  /**
   * 데이터 로드
   * @note 권한 체크는 AdminLayout에서 admin/super_admin 통합 처리
   */
  useEffect(() => {
    if (status === 'loading') return;
    fetchData();
  }, [session, status, router]);

  /**
   * 통합 페이지 데이터 일괄 로드
   *
   * @purpose Expert 카드 + User(계정 연결용) + ExpertExaminer(회사정보 매칭용) 모두 fetch
   * @decision 3개 병렬 호출, 부분 실패 허용 (examiners 실패해도 카드 관리는 계속)
   */
  const fetchData = async () => {
    try {
      const [expertsRes, usersRes, examinersRes] = await Promise.all([
        fetch('/api/admin/experts'),
        fetch('/api/admin/users'),
        fetch('/api/admin/examiners').catch(() => null),
      ]);

      const expertsData = await expertsRes.json();
      if (expertsData.success) {
        setExperts(expertsData.experts);
      }

      const usersData = await usersRes.json();
      if (usersData.success !== undefined ? usersData.success : usersData.users) {
        setUsers(usersData.users || []);
      }

      // examiners 매칭 정보 (brandPage 편집용)
      if (examinersRes && examinersRes.ok) {
        const examinersData = await examinersRes.json();
        const list = (examinersData?.examiners ?? examinersData?.data ?? []) as ExaminerLite[];
        setExaminers(list);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setMessage({ type: 'error', text: '데이터를 불러올 수 없습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 신규 전문가 등록 모달 열기 (구 expert-services 기능 흡수)
   */
  const openNewExpertModal = () => {
    setEditExpert({
      _id: '',
      name: '',
      position: '',
      companyName: '',
      email: '',
      isActive: true,
      specialties: [],
      introduction: '',
    } as Expert);
    setIsCreatingNew(true);
    setEditForm(EMPTY_EDIT_FORM);
    setImagePreview('');
    setCardImagePreview('');
  };

  /**
   * 전문가 카드 삭제 (구 expert-services 기능 흡수)
   */
  const handleDeleteExpert = async (expertId: string, name: string) => {
    if (!confirm(`전문가 "${name}" 카드를 삭제하시겠습니까? 회사정보(brandPage)는 유지됩니다.`)) {
      return;
    }
    try {
      const response = await fetch(`/api/experts?id=${expertId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setMessage({ type: 'success', text: '전문가 카드가 삭제되었습니다.' });
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || '삭제에 실패했습니다.' });
      }
    } catch (error) {
      console.error('Delete failed:', error);
      setMessage({ type: 'error', text: '삭제 중 오류가 발생했습니다.' });
    }
  };

  /**
   * 카드 이미지 업로드 핸들러 (cardImageUrl)
   */
  const handleCardImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => setCardImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setIsUploading('card');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await response.json();
      if (data.success && data.url) {
        setEditForm((prev) => ({ ...prev, cardImageUrl: data.url }));
        setCardImagePreview(data.url);
        setMessage({ type: 'success', text: '카드 이미지가 업로드되었습니다.' });
      } else {
        setMessage({ type: 'error', text: data.error || '카드 이미지 업로드 실패' });
      }
    } catch (error) {
      console.error('Card image upload failed:', error);
      setMessage({ type: 'error', text: '카드 이미지 업로드 중 오류가 발생했습니다.' });
    } finally {
      setIsUploading(null);
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

  /** 편집 모달 열기 (기존 카드 수정) */
  const openEditModal = (expert: Expert) => {
    setEditExpert(expert);
    setIsCreatingNew(false);
    setEditForm({
      name: expert.name || '',
      position: expert.position || '',
      companyName: expert.companyName || '',
      email: expert.email || '',
      specialties: expert.specialties?.join(', ') || '',
      introduction: expert.introduction || '',
      imageUrl: expert.imageUrl || '',
      cardImageUrl: expert.cardImageUrl || '',
      imageKey: expert.imageKey || '',
      order: expert.order ?? 0,
      isActive: expert.isActive ?? true,
    });
    setImagePreview(expert.imageUrl || '');
    setCardImagePreview(expert.cardImageUrl || '');
  };

  /** 편집 모달 닫기 */
  const closeEditModal = () => {
    setEditExpert(null);
    setIsCreatingNew(false);
    setImagePreview('');
    setCardImagePreview('');
    setIsSaving(false);
    setIsUploading(null);
  };

  /** 프로필 이미지 업로드 */
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
    setIsUploading('profile');
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
      setIsUploading(null);
    }
  };

  /**
   * 전문가 정보 저장 (신규 등록 / 기존 수정 분기)
   *
   * @decision
   *   - 신규: POST /api/experts (Mongoose Expert.create) — order/isActive/imageKey 자동
   *   - 수정: POST /api/admin/experts/update (직접 collection update) — cardImageUrl 추가
   */
  const handleSaveExpert = async () => {
    if (!editExpert) return;

    const specialtiesArray = editForm.specialties
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setIsSaving(true);
    try {
      let response: Response;

      if (isCreatingNew) {
        // 신규 등록 — Mongoose Expert.create
        response = await fetch('/api/experts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editForm.name,
            position: editForm.position,
            companyName: editForm.companyName,
            email: editForm.email,
            specialties: specialtiesArray,
            introduction: editForm.introduction,
            imageUrl: editForm.imageUrl,
            cardImageUrl: editForm.cardImageUrl,
            imageKey: editForm.imageKey || editForm.name, // 미입력 시 이름으로 fallback
            isActive: editForm.isActive,
          }),
        });
      } else {
        // 기존 카드 수정
        response = await fetch('/api/admin/experts/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expertId: editExpert._id,
            name: editForm.name,
            position: editForm.position,
            companyName: editForm.companyName,
            email: editForm.email,
            specialties: specialtiesArray,
            introduction: editForm.introduction,
            imageUrl: editForm.imageUrl,
            cardImageUrl: editForm.cardImageUrl,
          }),
        });
      }

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({
          type: 'success',
          text: isCreatingNew ? '전문가가 등록되었습니다.' : '전문가 정보가 수정되었습니다.',
        });
        fetchData();
        closeEditModal();
      } else {
        setMessage({
          type: 'error',
          text: data.error || (isCreatingNew ? '등록에 실패했습니다.' : '수정에 실패했습니다.'),
        });
      }
    } catch (error) {
      console.error('Failed to save expert:', error);
      setMessage({ type: 'error', text: '저장 중 오류가 발생했습니다.' });
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

  // 검색 필터링 (이름·회사·직책·전문분야·이메일)
  const filteredExperts = searchTerm
    ? experts.filter((e) => {
        const q = searchTerm.toLowerCase();
        return (
          (e.name || '').toLowerCase().includes(q) ||
          (e.companyName || '').toLowerCase().includes(q) ||
          (e.position || '').toLowerCase().includes(q) ||
          (e.email || '').toLowerCase().includes(q) ||
          (e.specialties || []).some((s) => s.toLowerCase().includes(q))
        );
      })
    : experts;

  return (
    <div className="admin-experts-page">
      <div className="admin-container">
        <header
          className="admin-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <h1>전문가 통합 관리</h1>
            <p>전문가 카드 · 계정 연결 · 회사정보(brandPage) 모두 관리합니다</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="search"
              placeholder="이름·회사·전문분야 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                height: 38,
                padding: '0 12px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                fontSize: 14,
                width: 240,
              }}
            />
            <button
              type="button"
              onClick={openNewExpertModal}
              style={{
                height: 38,
                padding: '0 16px',
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <i className="fas fa-plus" style={{ marginRight: 6 }} />새 전문가 등록
            </button>
          </div>
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
          {filteredExperts.map((expert) => {
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

                  {/* 회사정보(brandPage) 모달 — 사용자 핵심 요구 (2026-04-28) */}
                  <button
                    type="button"
                    onClick={() => setBrandModalExpert(expert)}
                    title="회사정보 (로고/소개/경력/성공케이스/연락처) 편집"
                  >
                    <i className="fas fa-building" />
                    회사정보
                  </button>

                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => handleDeleteExpert(expert._id, expert.name)}
                    title="전문가 카드 삭제"
                  >
                    <i className="fas fa-trash" />
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 전문가 편집/신규 모달 */}
      {editExpert && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isCreatingNew ? '새 전문가 등록' : `${editExpert.name} - 정보 수정`}</h2>
              <button onClick={closeEditModal} className="btn-close-modal">
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="modal-body">
              {/* 이미지 업로드 — 프로필 + 카드 */}
              <div
                className="edit-image-section"
                style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}
              >
                {/* 프로필 이미지 */}
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#6b7280',
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    프로필 이미지
                  </div>
                  <div className="edit-image-preview" onClick={() => fileInputRef.current?.click()}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="프로필 미리보기" />
                    ) : (
                      <div className="edit-image-placeholder">
                        <i className="fas fa-user" />
                        <span>프로필</span>
                      </div>
                    )}
                    {isUploading === 'profile' && (
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
                    disabled={!!isUploading}
                  >
                    <i className="fas fa-upload" />
                    {isUploading === 'profile' ? '업로드 중...' : '프로필 변경'}
                  </button>
                </div>

                {/* 카드 이미지 */}
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#6b7280',
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    카드 이미지 (목록 노출용)
                  </div>
                  <div
                    className="edit-image-preview"
                    onClick={() => cardFileInputRef.current?.click()}
                  >
                    {cardImagePreview ? (
                      <img src={cardImagePreview} alt="카드 미리보기" />
                    ) : (
                      <div className="edit-image-placeholder">
                        <i className="fas fa-id-card" />
                        <span>카드</span>
                      </div>
                    )}
                    {isUploading === 'card' && (
                      <div className="edit-image-uploading">
                        <div className="spinner" />
                      </div>
                    )}
                  </div>
                  <input
                    ref={cardFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleCardImageUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="btn-upload-image"
                    onClick={() => cardFileInputRef.current?.click()}
                    disabled={!!isUploading}
                  >
                    <i className="fas fa-upload" />
                    {isUploading === 'card' ? '업로드 중...' : '카드 변경'}
                  </button>
                </div>
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
                  disabled={isSaving || !!isUploading}
                >
                  <i className="fas fa-check" />
                  {isSaving ? '저장 중...' : isCreatingNew ? '등록' : '저장'}
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

      {/*
        회사정보(brandPage) 통합 편집 모달
        @purpose Expert 카드의 "회사정보" 버튼 클릭 시 매칭된 examiner 의 brandPage 편집
        @decision email 자동 매칭 → 매칭 실패 시 모달 내부에서 안내
      */}
      <ExaminerBrandModal
        open={!!brandModalExpert}
        examinerId={matchedExaminerForBrand?._id || null}
        examinerName={matchedExaminerForBrand?.name || brandModalExpert?.name || ''}
        examinerCompany={matchedExaminerForBrand?.companyName || brandModalExpert?.companyName}
        expertEmail={brandModalExpert?.email || ''}
        onClose={() => setBrandModalExpert(null)}
        onSaved={fetchData}
      />
    </div>
  );
}
