'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import './page.css';

/**
 * 전문가 서비스 관리 페이지
 * @purpose 전문가 카드 목록 표시, 수정 클릭 시 모달로 편집 (이미지 파일 업로드 포함)
 */

interface Expert {
  _id: string;
  name: string;
  position: string;
  companyName: string;
  specialties: string[];
  imageKey: string;
  imageUrl?: string;
  cardImageUrl?: string;
  order: number;
  isActive: boolean;
}

interface FormData {
  name: string;
  position: string;
  companyName: string;
  specialties: string;
  imageUrl: string;
  cardImageUrl: string;
  order: number;
  isActive: boolean;
}

const INITIAL_FORM: FormData = {
  name: '',
  position: '',
  companyName: '',
  specialties: '',
  imageUrl: '',
  cardImageUrl: '',
  order: 0,
  isActive: true,
};

export default function AdminExpertServicesPage() {
  const router = useRouter();
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(false);

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpert, setEditingExpert] = useState<Expert | null>(null);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [profilePreview, setProfilePreview] = useState('');
  const [cardPreview, setCardPreview] = useState('');
  const [isUploading, setIsUploading] = useState<'profile' | 'card' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchExperts();
  }, []);

  const fetchExperts = async () => {
    try {
      const response = await fetch('/api/experts?showAll=true');
      const data = await response.json();
      if (data.success) {
        setExperts(data.experts);
      }
    } catch (error) {
      console.error('Error fetching experts:', error);
      setMessage({ type: 'error', text: '전문가 목록을 불러오는데 실패했습니다.' });
    }
  };

  /** 모달 열기 - 수정 */
  const openEditModal = (expert: Expert) => {
    setEditingExpert(expert);
    setFormData({
      name: expert.name,
      position: expert.position,
      companyName: expert.companyName,
      specialties: expert.specialties.join(', '),
      imageUrl: expert.imageUrl || '',
      cardImageUrl: expert.cardImageUrl || '',
      order: expert.order,
      isActive: expert.isActive,
    });
    setProfilePreview(
      expert.imageUrl || (expert.imageKey ? `/images/examiners/${expert.imageKey}.png` : '')
    );
    setCardPreview(expert.cardImageUrl || '');
    setModalOpen(true);
  };

  /** 모달 열기 - 신규 등록 */
  const openNewModal = () => {
    setEditingExpert(null);
    setFormData(INITIAL_FORM);
    setProfilePreview('');
    setCardPreview('');
    setModalOpen(true);
  };

  /** 모달 닫기 */
  const closeModal = () => {
    setModalOpen(false);
    setEditingExpert(null);
    setFormData(INITIAL_FORM);
    setProfilePreview('');
    setCardPreview('');
    setIsUploading(null);
  };

  /** 이미지 파일 업로드 (프로필 또는 카드) */
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'profile' | 'card'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (type === 'profile') setProfilePreview(ev.target?.result as string);
      else setCardPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(type);
    try {
      const fd = new globalThis.FormData();
      fd.append('file', file);

      const response = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await response.json();

      if (data.success && data.url) {
        if (type === 'profile') {
          setFormData((prev) => ({ ...prev, imageUrl: data.url }));
          setProfilePreview(data.url);
        } else {
          setFormData((prev) => ({ ...prev, cardImageUrl: data.url }));
          setCardPreview(data.url);
        }
        setMessage({
          type: 'success',
          text: `${type === 'profile' ? '프로필' : '카드'} 이미지가 업로드되었습니다.`,
        });
      } else {
        setMessage({ type: 'error', text: data.error || '이미지 업로드 실패' });
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      setMessage({ type: 'error', text: '이미지 업로드 중 오류가 발생했습니다.' });
    } finally {
      setIsUploading(null);
    }
  };

  /** 저장 (등록/수정) */
  const handleSubmit = async () => {
    setLoading(true);

    const specialtiesArray = formData.specialties
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const url = '/api/experts';
      const method = editingExpert ? 'PUT' : 'POST';

      const payload = editingExpert
        ? {
            ...formData,
            specialties: specialtiesArray,
            id: editingExpert._id,
            imageKey: editingExpert.imageKey,
          }
        : { ...formData, specialties: specialtiesArray, imageKey: formData.name };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({
          type: 'success',
          text: editingExpert ? '전문가가 수정되었습니다.' : '전문가가 등록되었습니다.',
        });
        closeModal();
        fetchExperts();
      } else {
        setMessage({ type: 'error', text: data.error || '저장에 실패했습니다.' });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: '저장 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  /** 삭제 */
  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 전문가를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/experts?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-auth': 'true' },
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: '전문가가 삭제되었습니다.' });
        fetchExperts();
      } else {
        setMessage({ type: 'error', text: data.error || '삭제에 실패했습니다.' });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: '삭제 중 오류가 발생했습니다.' });
    }
  };

  return (
    <div className="admin-expert-svc">
      {/* 헤더 */}
      <div className="admin-expert-svc-header">
        <div>
          <h1>전문가 서비스 관리</h1>
          <p>등록된 전문가 {experts.length}명</p>
        </div>
        <div className="admin-expert-svc-header-actions">
          <button className="btn-new" onClick={openNewModal}>
            <i className="fas fa-plus" /> 새 전문가 등록
          </button>
          <button className="btn-preview" onClick={() => router.push('/expert-services')}>
            <i className="fas fa-external-link-alt" /> 사용자 페이지 보기
          </button>
        </div>
      </div>

      {/* 메시지 */}
      {message && (
        <div className={`admin-msg ${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>
            <i className="fas fa-times" />
          </button>
        </div>
      )}

      {/* 전문가 카드 그리드 */}
      <div className="expert-svc-grid">
        {experts.map((expert) => (
          <div key={expert._id} className={`expert-svc-card ${!expert.isActive ? 'inactive' : ''}`}>
            <div className="expert-svc-card-img">
              {expert.cardImageUrl ? (
                <img src={expert.cardImageUrl} alt={`${expert.name} 카드`} />
              ) : (
                <img
                  src={expert.imageUrl || `/images/examiners/${expert.imageKey}.png`}
                  alt={expert.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/default-examiner.png';
                  }}
                />
              )}
              {!expert.isActive && <span className="inactive-badge">비활성</span>}
            </div>
            <div className="expert-svc-card-bottom">
              <span className="expert-svc-card-name">
                {expert.name} · {expert.companyName}
              </span>
              <div className="expert-svc-card-actions">
                <button className="btn-edit" onClick={() => openEditModal(expert)}>
                  <i className="fas fa-pen" /> 수정
                </button>
                <button className="btn-delete" onClick={() => handleDelete(expert._id)}>
                  <i className="fas fa-trash" /> 삭제
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 편집/등록 모달 */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingExpert ? `${editingExpert.name} - 수정` : '새 전문가 등록'}</h2>
              <button onClick={closeModal} className="btn-close-modal">
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="modal-body">
              {/* 이미지 업로드 - 프로필 + 카드 */}
              <div className="modal-images-row">
                {/* 프로필 이미지 */}
                <div className="modal-image-section">
                  <span className="modal-image-label">프로필 이미지</span>
                  <div
                    className="modal-image-preview"
                    onClick={() => profileInputRef.current?.click()}
                  >
                    {profilePreview ? (
                      <img src={profilePreview} alt="프로필 미리보기" />
                    ) : (
                      <div className="modal-image-placeholder">
                        <i className="fas fa-user" />
                        <span>프로필</span>
                      </div>
                    )}
                    {isUploading === 'profile' && (
                      <div className="modal-image-uploading">
                        <div className="spinner" />
                      </div>
                    )}
                  </div>
                  <input
                    ref={profileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => handleImageUpload(e, 'profile')}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="btn-upload"
                    onClick={() => profileInputRef.current?.click()}
                    disabled={!!isUploading}
                  >
                    <i className="fas fa-upload" />{' '}
                    {isUploading === 'profile' ? '업로드 중...' : '프로필 변경'}
                  </button>
                </div>

                {/* 카드 이미지 */}
                <div className="modal-image-section">
                  <span className="modal-image-label">카드 이미지</span>
                  <div
                    className="modal-image-preview card-preview"
                    onClick={() => cardInputRef.current?.click()}
                  >
                    {cardPreview ? (
                      <img src={cardPreview} alt="카드 미리보기" />
                    ) : (
                      <div className="modal-image-placeholder">
                        <i className="fas fa-id-card" />
                        <span>카드</span>
                      </div>
                    )}
                    {isUploading === 'card' && (
                      <div className="modal-image-uploading">
                        <div className="spinner" />
                      </div>
                    )}
                  </div>
                  <input
                    ref={cardInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => handleImageUpload(e, 'card')}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="btn-upload"
                    onClick={() => cardInputRef.current?.click()}
                    disabled={!!isUploading}
                  >
                    <i className="fas fa-upload" />{' '}
                    {isUploading === 'card' ? '업로드 중...' : '카드 변경'}
                  </button>
                </div>
              </div>

              {/* 폼 필드 */}
              <div className="modal-form-grid">
                <div className="modal-field">
                  <label>이름</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="modal-field">
                  <label>직책</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required
                  />
                </div>
                <div className="modal-field">
                  <label>회사명</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    required
                  />
                </div>
                <div className="modal-field">
                  <label>정렬 순서</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) =>
                      setFormData({ ...formData, order: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="modal-field full-width">
                  <label>전문 분야 (쉼표로 구분)</label>
                  <input
                    type="text"
                    value={formData.specialties}
                    onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                    placeholder="세무조사, 절세전략, 기업자문"
                  />
                </div>
                <div className="modal-field full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    활성화
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button onClick={closeModal} className="btn-cancel">
                  취소
                </button>
                <button
                  onClick={handleSubmit}
                  className="btn-confirm"
                  disabled={loading || isUploading || !formData.name}
                >
                  <i className="fas fa-check" />
                  {loading ? '저장 중...' : editingExpert ? '수정' : '등록'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
