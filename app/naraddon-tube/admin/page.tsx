'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import './NaraddonTubeAdmin.css';

interface TubeVideo {
  title: string;
  youtubeId: string;
  url: string;
  customThumbnail?: string;
}

interface TubeEntry {
  _id: string;
  videos: TubeVideo[]; // 1개만 포함
  isPublished: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_FORM_STATE = {
  youtubeUrl: '',
  title: '',
  sortOrder: 0,
  isPublished: true,
};

type FormMode = 'create' | 'edit';

export default function NaraddonTubeAdminPage() {
  const [videos, setVideos] = useState<TubeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAdminBoardVisible, setIsAdminBoardVisible] = useState(false);

  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...DEFAULT_FORM_STATE });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [originalThumbnailUrl, setOriginalThumbnailUrl] = useState('');
  const [shouldClearThumbnail, setShouldClearThumbnail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [boardMessage, setBoardMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 관리자 세션 확인 - 이미 로그인했으면 비밀번호 입력 건너뛰기
  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        const res = await fetch('/api/admin/check-session', {
          method: 'GET',
          credentials: 'include'
        });

        if (res.ok) {
          const data = await res.json();
          const userRole = data.user?.role;

          if (userRole === 'admin' || userRole === 'super_admin') {
            const pwdRes = await fetch('/api/naraddon-tube/get-password', {
              method: 'GET',
              credentials: 'include'
            });

            if (pwdRes.ok) {
              const pwdData = await pwdRes.json();
              setAdminPassword(pwdData.password || '');
              setIsAdminBoardVisible(true);
              resetForm();
              fetchVideos();
            }
          }
        }
      } catch (error) {
        console.error('[NaraddonTubeAdmin] session check error:', error);
      }
    };

    checkAdminSession();
  }, []);

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/naraddon-tube?includeDraft=true');
      const data = await response.json();

      if (Array.isArray(data?.entries)) {
        setVideos(data.entries);
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormMode('create');
    setEditingVideoId(null);
    setFormData({ ...DEFAULT_FORM_STATE });
    setThumbnailFile(null);
    setThumbnailPreview('');
    setOriginalThumbnailUrl('');
    setShouldClearThumbnail(false);
    setBoardMessage(null);
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError('');
    setIsVerifying(true);

    try {
      const response = await fetch('/api/naraddon-tube/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });

      const data = await response.json();

      if (data.success || response.ok) {
        setAdminPassword(passwordInput);
        setShowPasswordModal(false);
        setPasswordInput('');
        resetForm();
        setIsAdminBoardVisible(true);
        fetchVideos();
      } else {
        setPasswordError(data.message || '비밀번호가 올바르지 않습니다.');
      }
    } catch (error) {
      console.error('[naraddon-tube] password verify failed', error);
      setPasswordError('인증 처리 중 오류가 발생했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleThumbnailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하만 허용됩니다.');
      return;
    }

    setThumbnailFile(file);
    setShouldClearThumbnail(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      setThumbnailPreview((e.target?.result as string) ?? '');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview('');
    setShouldClearThumbnail(formMode === 'edit' && !!originalThumbnailUrl);
  };

  const uploadThumbnailIfNeeded = async (): Promise<string | null> => {
    if (!thumbnailFile) {
      return null;
    }

    try {
      const presignResponse = await fetch('/api/naraddon-tube/assets/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: adminPassword,
          fileName: thumbnailFile.name,
          contentType: thumbnailFile.type,
        }),
      });

      const presignData = await presignResponse.json();

      if (!presignData.uploadUrl) {
        throw new Error(presignData.message || '업로드 URL 생성 실패');
      }

      const uploadResponse = await fetch(presignData.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': thumbnailFile.type,
        },
        body: thumbnailFile,
      });

      if (!uploadResponse.ok) {
        throw new Error('썸네일 업로드에 실패했습니다.');
      }

      return presignData.publicUrl as string;
    } catch (error) {
      console.error('[naraddon-tube] thumbnail upload failed', error);
      const shouldContinue = confirm('썸네일 업로드에 실패했습니다. 썸네일 없이 계속 진행할까요?');
      if (shouldContinue) {
        return null;
      }
      throw error;
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!adminPassword) {
      alert('관리자 인증이 필요합니다.');
      return;
    }

    if (!formData.youtubeUrl || !formData.title) {
      alert('YouTube URL과 제목은 필수입니다.');
      return;
    }

    setIsSubmitting(true);
    setBoardMessage(null);

    try {
      const uploadedThumbnailUrl = await uploadThumbnailIfNeeded();

      const payload: any = {
        password: adminPassword,
        title: formData.title,
        youtubeUrl: formData.youtubeUrl,
        sortOrder: formData.sortOrder,
        isPublished: formData.isPublished,
      };

      if (uploadedThumbnailUrl) {
        payload.customThumbnail = uploadedThumbnailUrl;
      }

      if (formMode === 'create') {
        const response = await fetch('/api/naraddon-tube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || '영상 등록에 실패했습니다.');
        }

        setBoardMessage('영상이 등록되었습니다.');
      } else {
        if (!editingVideoId) {
          throw new Error('수정할 영상 정보가 올바르지 않습니다.');
        }

        if (shouldClearThumbnail) {
          payload.clearThumbnail = true;
        }

        const response = await fetch('/api/naraddon-tube/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            entryId: editingVideoId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || '영상 정보를 수정하지 못했습니다.');
        }

        setBoardMessage('영상 정보가 수정되었습니다.');
      }

      await fetchVideos();
      resetForm();
    } catch (error) {
      console.error('[naraddon-tube] submit failed', error);
      setBoardMessage(error instanceof Error ? error.message : '요청 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEdit = (video: TubeEntry) => {
    if (!video.videos || video.videos.length === 0) return;

    const videoData = video.videos[0];
    setFormMode('edit');
    setEditingVideoId(video._id);
    setFormData({
      youtubeUrl: videoData.url ?? '',
      title: videoData.title ?? '',
      sortOrder: video.sortOrder ?? 0,
      isPublished: video.isPublished ?? true,
    });
    const existingThumbnail = videoData.customThumbnail || '';
    setThumbnailFile(null);
    setThumbnailPreview(existingThumbnail);
    setOriginalThumbnailUrl(existingThumbnail);
    setShouldClearThumbnail(false);
    setBoardMessage(null);
  };

  const handleDelete = async (videoId: string) => {
    if (!adminPassword) {
      alert('관리자 인증이 필요합니다.');
      return;
    }

    const confirmed = confirm('해당 영상을 삭제하시겠습니까?');
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch('/api/naraddon-tube/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword, entryId: videoId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '영상 삭제에 실패했습니다.');
      }

      setBoardMessage('영상이 삭제되었습니다.');
      await fetchVideos();
      if (editingVideoId === videoId) {
        resetForm();
      }
    } catch (error) {
      console.error('[naraddon-tube] delete failed', error);
      setBoardMessage(error instanceof Error ? error.message : '영상 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleCloseBoard = () => {
    setIsAdminBoardVisible(false);
    setAdminPassword('');
    resetForm();
  };

  return (
    <section className="interview-section-new">
      <div className="section-header">
        <h2>나라똔 튜브 관리</h2>
        <p>영상을 등록, 수정, 삭제할 수 있습니다.</p>
      </div>

      <div className="interview-videos-container">
        <button
          type="button"
          className="add-video-btn"
          onClick={() => setShowPasswordModal(true)}
        >
          나라똔 튜브 영상 관리하기
        </button>
      </div>

      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <h3>관리자 인증</h3>
            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label>관리자 비밀번호</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(event) => setPasswordInput(event.target.value)}
                  placeholder="비밀번호를 입력해주세요"
                />
                {passwordError ? <p className="error-text">{passwordError}</p> : null}
              </div>
              <div className="modal-buttons">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="cancel-btn"
                  disabled={isVerifying}
                >
                  취소
                </button>
                <button type="submit" disabled={isVerifying}>
                  {isVerifying ? '확인 중…' : '확인'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAdminBoardVisible && (
        <div className="admin-board-overlay" onClick={handleCloseBoard}>
          <div className="admin-board-panel" onClick={(event) => event.stopPropagation()}>
            <header className="admin-board-header">
              <div>
                <h3>나라똔 튜브 영상 관리</h3>
                <p>등록, 수정, 삭제를 이 화면에서 바로 진행할 수 있습니다.</p>
              </div>
              <button type="button" className="close-board-btn" onClick={handleCloseBoard}>
                닫기
              </button>
            </header>

            <div className="admin-board-columns">
              <section className="admin-board-list">
                <div className="list-header">
                  <h4>영상 목록</h4>
                  <span>{videos.length}건</span>
                </div>
                <div className="list-table-wrapper">
                  {videos.length === 0 ? (
                    <p className="empty-message">등록된 영상이 없습니다. 먼저 영상을 등록해주세요.</p>
                  ) : (
                    <table className="admin-board-table">
                      <thead>
                        <tr>
                          <th>No.</th>
                          <th>영상 정보</th>
                          <th>상태</th>
                          <th>우선순위</th>
                          <th>관리</th>
                        </tr>
                      </thead>
                      <tbody>
                        {videos.map((video, index) => {
                          const videoData = video.videos[0];
                          return (
                            <tr key={video._id} className={editingVideoId === video._id ? 'is-editing' : ''}>
                              <td>{index + 1}</td>
                              <td>
                                <strong className="video-title">{videoData?.title || '제목 없음'}</strong>
                                <span className="video-link">{videoData?.url}</span>
                              </td>
                              <td>
                                <span className={`status-badge ${video.isPublished ? 'published' : 'draft'}`}>
                                  {video.isPublished ? '공개' : '임시'}
                                </span>
                              </td>
                              <td>{video.sortOrder}</td>
                              <td className="board-actions">
                                <button type="button" onClick={() => handleEdit(video)}>
                                  수정
                                </button>
                                <button
                                  type="button"
                                  className="danger"
                                  onClick={() => handleDelete(video._id)}
                                >
                                  삭제
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>

              <section className="admin-board-form">
                <div className="form-header">
                  <h4>{formMode === 'create' ? '새 영상 등록' : '영상 정보 수정'}</h4>
                  {formMode === 'edit' ? (
                    <button type="button" onClick={resetForm} className="reset-btn">
                      새 영상 등록으로 전환
                    </button>
                  ) : null}
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>YouTube URL *</label>
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={formData.youtubeUrl}
                      onChange={(event) => setFormData({ ...formData, youtubeUrl: event.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>영상 제목 *</label>
                    <input
                      type="text"
                      placeholder="예) 나라똔으로 5억 연구개발 자금 확보"
                      value={formData.title}
                      onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>우선순위 (낮을수록 먼저 표시)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.sortOrder}
                        onChange={(event) => setFormData({ ...formData, sortOrder: Number(event.target.value) })}
                      />
                    </div>
                    <div className="form-group">
                      <label>공개 상태</label>
                      <select
                        value={formData.isPublished ? 'published' : 'draft'}
                        onChange={(event) => setFormData({ ...formData, isPublished: event.target.value === 'published' })}
                      >
                        <option value="published">바로 공개</option>
                        <option value="draft">임시 저장</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>커스텀 썸네일 (선택)</label>
                    <div className="thumbnail-upload">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailChange}
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="thumbnail-select-btn"
                      >
                        이미지 선택
                      </button>
                      {thumbnailPreview ? (
                        <div className="thumbnail-preview">
                          <img src={thumbnailPreview} alt="썸네일 미리보기" />
                          <button type="button" onClick={handleRemoveThumbnail} className="remove-thumbnail">
                            제거
                          </button>
                        </div>
                      ) : (
                        <p className="form-help">선택하지 않으면 YouTube 기본 썸네일이 사용됩니다.</p>
                      )}
                    </div>
                  </div>

                  {boardMessage ? <p className="board-message">{boardMessage}</p> : null}

                  <div className="form-actions">
                    <button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? '저장 중…' : formMode === 'create' ? '영상 등록하기' : '영상 정보 수정하기'}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
