'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

import './interview-admin-board.css';

interface InterviewVideo {
  _id: string;
  youtubeUrl: string;
  youtubeId?: string;
  displayThumbnail?: string;
  thumbnailUrl?: string;
  title: string;
  description?: string;
  author?: string;
  company?: string;
  amount?: string;
  views?: number;
}

interface VideoModalProps {
  video: InterviewVideo | null;
  isOpen: boolean;
  onClose: () => void;
}

type FormMode = 'create' | 'edit';

const DEFAULT_FORM_STATE = {
  youtubeUrl: '',
  title: '',
  description: '',
  author: '',
  company: '',
  amount: '',
};

// 비디오 모달 컴포넌트
function VideoModal({ video, isOpen, onClose }: VideoModalProps) {
  if (!isOpen || !video) return null;

  const extractYoutubeId = (url: string): string => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : '';
  };

  const videoId = video.youtubeId || extractYoutubeId(video.youtubeUrl);

  return (
    <div className="video-modal-overlay" onClick={onClose}>
      <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="video-modal-close" onClick={onClose}>
          ✕
        </button>
        <div className="video-modal-player">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        </div>
        <div className="video-modal-info">
          <h3>{video.title}</h3>
          {video.description && <p>{video.description}</p>}
          <div className="video-modal-meta">
            {video.author && <span>{video.author}</span>}
            {video.company && <span>{video.company}</span>}
            {video.amount && <span>{video.amount}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InterviewSection() {
  const [videos, setVideos] = useState<InterviewVideo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAdminBoardVisible, setIsAdminBoardVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<InterviewVideo | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());

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
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    fetchVideos();
  }, []);

  // Intersection Observer for lazy loading video cards
  useEffect(() => {
    if (typeof window === 'undefined') return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cardId = entry.target.getAttribute('data-card-id');
            if (cardId) {
              setVisibleCards(prev => new Set([...prev, cardId]));
            }
          }
        });
      },
      {
        rootMargin: '200px', // Start loading 200px before entering viewport
        threshold: 0.01 // Load as soon as element starts appearing
      }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  // Update observer when videos change
  useEffect(() => {
    if (!observerRef.current) return;

    const visibleVids = videos.slice(currentIndex, currentIndex + 3);

    // Observe new cards
    cardRefs.current.forEach((element, cardId) => {
      if (visibleVids.some(video => video._id === cardId)) {
        observerRef.current?.observe(element);
      }
    });

    return () => {
      cardRefs.current.forEach((element) => {
        observerRef.current?.unobserve(element);
      });
    };
  }, [videos, currentIndex]);

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/business-voice/interview-videos');
      const data = await response.json();

      if (data.success && Array.isArray(data.videos)) {
        setVideos(data.videos);

        // 처음 3개 썸네일 미리 로드
        data.videos.slice(0, 3).forEach((video: InterviewVideo) => {
          const videoId = video.youtubeId || video.youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
          if (videoId) {
            const img = new window.Image();
            img.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
          }
        });
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
      const response = await fetch('/api/business-voice/interview-videos/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });

      const data = await response.json();

      if (data.success) {
        setAdminPassword(passwordInput);
        setShowPasswordModal(false);
        setPasswordInput('');
        resetForm();
        setIsAdminBoardVisible(true);
      } else {
        setPasswordError(data.message || '비밀번호가 올바르지 않습니다.');
      }
    } catch (error) {
      console.error('[interview] password verify failed', error);
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
      const presignResponse = await fetch('/api/business-voice/interview-videos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: adminPassword,
          fileName: thumbnailFile.name,
          contentType: thumbnailFile.type,
        }),
      });

      const presignData = await presignResponse.json();

      if (!presignData.success) {
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
      console.error('[interview] thumbnail upload failed', error);
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

      if (formMode === 'create') {
        const response = await fetch('/api/business-voice/interview-videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: adminPassword,
            ...formData,
            thumbnailUrl: uploadedThumbnailUrl ?? '',
          }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || '영상 등록에 실패했습니다.');
        }

        setBoardMessage('영상이 등록되었습니다.');
      } else {
        if (!editingVideoId) {
          throw new Error('수정할 영상 정보가 올바르지 않습니다.');
        }

        const payload: Record<string, unknown> = {
          password: adminPassword,
          ...formData,
        };

        if (uploadedThumbnailUrl) {
          payload.thumbnailUrl = uploadedThumbnailUrl;
        } else if (shouldClearThumbnail) {
          payload.clearThumbnail = true;
        }

        const response = await fetch(`/api/business-voice/interview-videos/${editingVideoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || '영상 정보를 수정하지 못했습니다.');
        }

        setBoardMessage('영상 정보가 수정되었습니다.');
      }

      await fetchVideos();
      resetForm();
    } catch (error) {
      console.error('[interview] submit failed', error);
      setBoardMessage(error instanceof Error ? error.message : '요청 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEdit = (video: InterviewVideo) => {
    setFormMode('edit');
    setEditingVideoId(video._id);
    setFormData({
      youtubeUrl: video.youtubeUrl ?? '',
      title: video.title ?? '',
      description: video.description ?? '',
      author: video.author ?? '',
      company: video.company ?? '',
      amount: video.amount ?? '',
    });
    const existingThumbnail = video.thumbnailUrl || video.displayThumbnail || '';
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
      const response = await fetch(`/api/business-voice/interview-videos/${videoId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '영상 삭제에 실패했습니다.');
      }

      setBoardMessage('영상이 삭제되었습니다.');
      await fetchVideos();
      if (editingVideoId === videoId) {
        resetForm();
      }
    } catch (error) {
      console.error('[interview] delete failed', error);
      setBoardMessage(error instanceof Error ? error.message : '영상 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleCloseBoard = () => {
    setIsAdminBoardVisible(false);
    setAdminPassword('');
    resetForm();
  };

  const handlePrevSlide = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNextSlide = () => {
    if (currentIndex < Math.max(0, videos.length - 3)) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Handle image load state
  const handleImageLoad = useCallback((imageUrl: string) => {
    setLoadedImages(prev => new Set([...prev, imageUrl]));
  }, []);

  // Set card ref for intersection observer
  const setCardRef = useCallback((element: HTMLDivElement | null, cardId: string) => {
    if (element) {
      cardRefs.current.set(cardId, element);
    } else {
      cardRefs.current.delete(cardId);
    }
  }, []);

  const visibleVideos = videos.slice(currentIndex, currentIndex + 3);

  // Preload next slide images - 성능 최적화
  const preloadNextSlideImages = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < Math.max(0, videos.length - 3)) {
      const nextVideos = videos.slice(nextIndex, nextIndex + 3);

      nextVideos.forEach((video) => {
        const extractYoutubeId = (url: string): string => {
          const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
          return match ? match[1] : '';
        };
        const videoId = video.youtubeId || extractYoutubeId(video.youtubeUrl);
        const youtubeThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        const thumbnailUrl = video.displayThumbnail || video.thumbnailUrl || youtubeThumbnail;

        if (!preloadedImages.has(thumbnailUrl)) {
          const img = new window.Image();
          img.src = thumbnailUrl;
          img.onload = () => {
            setPreloadedImages(prev => new Set([...prev, thumbnailUrl]));
          };
        }
      });
    }
  }, [currentIndex, videos, preloadedImages]);

  // Preload images when current index changes
  useEffect(() => {
    preloadNextSlideImages();
  }, [preloadNextSlideImages]);

  const handleVideoClick = (video: InterviewVideo) => {
    setSelectedVideo(video);
    setIsVideoModalOpen(true);
  };

  const handleCloseVideoModal = () => {
    setSelectedVideo(null);
    setIsVideoModalOpen(false);
  };

  return (
    <section id="interview-section" className="interview-section-new">
      <div className="section-header">
        <h2>나라똔과 함께한 대표님 인터뷰</h2>
        <p>현재 실무지원금을 받은 대표님들의 생생한 후기입니다.</p>
      </div>

      <div className="interview-videos-container">
        <div className="videos-slider">
          {videos.length > 3 && currentIndex > 0 && (
            <button className="slider-arrow arrow-left" onClick={handlePrevSlide}>
              ←
            </button>
          )}

          <div className="videos-grid">
            {isLoading ? (
              <div className="loading-message">영상을 불러오는 중…</div>
            ) : visibleVideos.length > 0 ? (
              visibleVideos.map((video) => {
                const extractYoutubeId = (url: string): string => {
                  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
                  return match ? match[1] : '';
                };
                const videoId = video.youtubeId || extractYoutubeId(video.youtubeUrl);
                // mqdefault를 기본으로 사용 (320x180, 더 빠른 로딩)
                const youtubeThumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                const thumbnailUrl = video.displayThumbnail || video.thumbnailUrl || youtubeThumbnail;

                const isVisible = visibleCards.has(video._id);
                const isImageLoaded = loadedImages.has(thumbnailUrl);
                const shouldLoadEagerly = currentIndex === 0; // Load first 3 eagerly

                return (
                  <div
                    key={video._id}
                    className="video-card"
                    onClick={() => handleVideoClick(video)}
                    ref={(el) => setCardRef(el, video._id)}
                    data-card-id={video._id}
                  >
                    <div className="video-thumbnail">
                      {/* Skeleton/blur placeholder */}
                      {!isImageLoaded && (
                        <div className="thumbnail-skeleton">
                          <div className="skeleton-shimmer"></div>
                        </div>
                      )}

                      <Image
                        src={thumbnailUrl}
                        alt={video.title}
                        width={320}
                        height={180}
                        priority={shouldLoadEagerly}
                        style={{
                          opacity: isImageLoaded ? 1 : 0,
                          transition: 'opacity 0.3s ease-in-out',
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center'
                        }}
                        onLoad={() => handleImageLoad(thumbnailUrl)}
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          // mqdefault가 없으면 default로 폴백
                          if (target.src.includes('mqdefault')) {
                            target.src = `https://img.youtube.com/vi/${videoId}/default.jpg`;
                          }
                        }}
                        unoptimized
                      />

                      <div className="play-overlay">
                        <div className="play-icon">
                          <svg viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="video-info">
                      <h3>{video.title}</h3>
                      {video.description ? <p>{video.description}</p> : null}
                      <div className="video-meta">
                        {video.author ? <span>{video.author}</span> : null}
                        {video.company ? <span>{video.company}</span> : null}
                        {video.amount ? <span>{video.amount}</span> : null}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-message">등록된 영상이 없습니다.</div>
            )}
          </div>

          {videos.length > 3 && currentIndex < Math.max(0, videos.length - 3) && (
            <button className="slider-arrow arrow-right" onClick={handleNextSlide}>
              →
            </button>
          )}
        </div>

        <button
          type="button"
          className="add-video-btn"
          onClick={() => setShowPasswordModal(true)}
        >
          나라똔 인터뷰 영상 등록하기
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
                <h3>나라똔 인터뷰 영상 관리</h3>
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
                          <th>추가 정보</th>
                          <th>관리</th>
                        </tr>
                      </thead>
                      <tbody>
                        {videos.map((video, index) => (
                          <tr key={video._id} className={editingVideoId === video._id ? 'is-editing' : ''}>
                            <td>{index + 1}</td>
                            <td>
                              <strong className="video-title">{video.title || '제목 없음'}</strong>
                              <span className="video-link">{video.youtubeUrl}</span>
                            </td>
                            <td>
                              <div className="video-meta-lines">
                                {video.author ? <span>인터뷰이: {video.author}</span> : null}
                                {video.company ? <span>기업명: {video.company}</span> : null}
                                {video.amount ? <span>지급금액: {video.amount}</span> : null}
                              </div>
                            </td>
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
                        ))}
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
                    <label>제목 *</label>
                    <input
                      type="text"
                      placeholder="예) 5억 연구개발 자금 확보 비결"
                      value={formData.title}
                      onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>설명</label>
                    <textarea
                      placeholder="영상에 대한 간단한 설명을 입력해주세요"
                      value={formData.description}
                      onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>인터뷰이 이름</label>
                      <input
                        type="text"
                        placeholder="예) 김대표"
                        value={formData.author}
                        onChange={(event) => setFormData({ ...formData, author: event.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>기업명</label>
                      <input
                        type="text"
                        placeholder="예) 나라똔 솔루션"
                        value={formData.company}
                        onChange={(event) => setFormData({ ...formData, company: event.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>지급 금액</label>
                    <input
                      type="text"
                      placeholder="예) 총 5억원"
                      value={formData.amount}
                      onChange={(event) => setFormData({ ...formData, amount: event.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>썸네일 이미지 (선택)</label>
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
                    {formMode === 'edit' && originalThumbnailUrl && !thumbnailPreview ? (
                      <p className="form-help">저장하면 기존 썸네일이 제거됩니다.</p>
                    ) : null}
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

      {/* 비디오 모달 */}
      <VideoModal
        video={selectedVideo}
        isOpen={isVideoModalOpen}
        onClose={handleCloseVideoModal}
      />
    </section>
  );
}