'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface TubeVideo {
  title: string;
  youtubeId: string;
  url: string;
  customThumbnail?: string;
}

interface TubeEntry {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  thumbnailUrl: string;
  videos: TubeVideo[];
  isPublished: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

interface UploadFormState {
  title: string;
  subtitle: string;
  description: string;
  thumbnailUrl: string;
  video1Title: string;
  video1Url: string;
  video2Title: string;
  video2Url: string;
  sortOrder: number;
  isPublished: boolean;
}

type FeedbackState = { type: 'success' | 'error'; text: string } | null;

const initialUploadForm: UploadFormState = {
  title: '',
  subtitle: '',
  description: '',
  thumbnailUrl: '',
  video1Title: '',
  video1Url: '',
  video2Title: '',
  video2Url: '',
  sortOrder: 0,
  isPublished: true,
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

const NaraddonTubeAdminPage: React.FC = () => {
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoadingPassword, setIsLoadingPassword] = useState(true);

  const [entries, setEntries] = useState<TubeEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [loadEntriesError, setLoadEntriesError] = useState<string | null>(null);

  const [uploadForm, setUploadForm] = useState<UploadFormState>(initialUploadForm);
  const [formFeedback, setFormFeedback] = useState<FeedbackState>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TubeEntry | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  const [thumbnailFeedback, setThumbnailFeedback] = useState<FeedbackState>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [pendingThumbnailKey, setPendingThumbnailKey] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formattedEntries = useMemo(
    () => [...entries].sort((a, b) => a.sortOrder - b.sortOrder),
    [entries]
  );

  // Fetch password on mount
  useEffect(() => {
    const fetchPassword = async () => {
      try {
        const response = await fetch('/api/naraddon-tube/get-password');
        if (!response.ok) {
          throw new Error('Failed to fetch password');
        }
        const data = await response.json();
        setAdminPassword(data.password);
      } catch (error) {
        console.error('[NaraddonTubeAdmin] fetchPassword', error);
        setFormFeedback({
          type: 'error',
          text: '관리자 인증에 실패했습니다. 페이지를 새로고침해주세요.',
        });
      } finally {
        setIsLoadingPassword(false);
      }
    };

    void fetchPassword();
  }, []);

  const fetchEntries = useCallback(async () => {
    try {
      setIsLoadingEntries(true);
      setLoadEntriesError(null);
      const response = await fetch('/api/naraddon-tube?includeDraft=true', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('나라똔튜브 데이터를 불러오지 못했어요.');
      }
      const data = await response.json();
      if (Array.isArray(data?.entries)) {
        setEntries(data.entries as TubeEntry[]);
      } else {
        setEntries([]);
      }
    } catch (error) {
      console.error('[NaraddonTubeAdmin] fetchEntries', error);
      setLoadEntriesError('나라똔튜브 목록을 가져오는 중 문제가 발생했어요.');
      setEntries([]);
    } finally {
      setIsLoadingEntries(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoadingPassword && adminPassword) {
      void fetchEntries();
    }
  }, [isLoadingPassword, adminPassword, fetchEntries]);

  const updateFormField = useCallback(
    <K extends keyof UploadFormState>(field: K, value: UploadFormState[K]) => {
      setUploadForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const deleteObjectFromR2 = useCallback(
    async (objectKey: string) => {
      if (!adminPassword) {
        return false;
      }

      try {
        const response = await fetch('/api/naraddon-tube/assets/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: adminPassword, objectKey }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.message || '썸네일을 삭제하지 못했습니다.');
        }
        return true;
      } catch (error) {
        console.error('[NaraddonTubeAdmin] deleteObject', error);
        setThumbnailFeedback({
          type: 'error',
          text: error instanceof Error ? error.message : '썸네일 삭제 중 문제가 발생했습니다.',
        });
        return false;
      }
    },
    [adminPassword]
  );

  const resetForm = useCallback(
    async (options?: { preserveThumbnail?: boolean }) => {
      if (!options?.preserveThumbnail && pendingThumbnailKey) {
        await deleteObjectFromR2(pendingThumbnailKey);
      }

      setUploadForm(initialUploadForm);
      setThumbnailFeedback(null);
      setPendingThumbnailKey(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [deleteObjectFromR2, pendingThumbnailKey]
  );

  const uploadThumbnailToR2 = useCallback(
    async (file: File) => {
      if (!adminPassword) {
        setThumbnailFeedback({ type: 'error', text: '비밀번호 확인 후 다시 시도해 주세요.' });
        return;
      }

      setIsUploadingThumbnail(true);
      setThumbnailFeedback(null);

      if (pendingThumbnailKey) {
        await deleteObjectFromR2(pendingThumbnailKey);
        setPendingThumbnailKey(null);
      }

      try {
        const response = await fetch('/api/naraddon-tube/assets/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: adminPassword,
            fileName: file.name,
            contentType: file.type || 'application/octet-stream',
          }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || '썸네일 업로드 URL을 발급받지 못했습니다.');
        }

        const { uploadUrl, objectKey, publicUrl } = data ?? {};
        if (!uploadUrl || !objectKey || !publicUrl) {
          throw new Error('썸네일 업로드 정보가 올바르지 않습니다.');
        }

        const uploadResponse = await fetch(uploadUrl as string, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error('썸네일 업로드가 실패했습니다.');
        }

        setPendingThumbnailKey(objectKey as string);
        updateFormField('thumbnailUrl', publicUrl as string);
        setThumbnailFeedback({ type: 'success', text: '썸네일 업로드가 완료되었습니다.' });
      } catch (error) {
        setThumbnailFeedback({
          type: 'error',
          text: error instanceof Error ? error.message : '썸네일 업로드 중 문제가 발생했습니다.',
        });
        console.error('[NaraddonTubeAdmin] uploadThumbnail', error);
      } finally {
        setIsUploadingThumbnail(false);
      }
    },
    [adminPassword, deleteObjectFromR2, pendingThumbnailKey, updateFormField]
  );

  const handleThumbnailSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setThumbnailFeedback({ type: 'error', text: '이미지 용량은 5MB 이하만 업로드할 수 있어요.' });
      event.target.value = '';
      return;
    }

    if (file.type && !ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setThumbnailFeedback({ type: 'error', text: 'JPG, PNG, WEBP, AVIF 형식만 지원합니다.' });
      event.target.value = '';
      return;
    }

    await uploadThumbnailToR2(file);
  };

  const clearThumbnailSelection = async () => {
    if (pendingThumbnailKey) {
      await deleteObjectFromR2(pendingThumbnailKey);
    }
    setPendingThumbnailKey(null);
    updateFormField('thumbnailUrl', '');
    setThumbnailFeedback(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditEntry = (entry: TubeEntry) => {
    setEditingEntry(entry);
    setUploadForm({
      title: entry.title,
      subtitle: entry.subtitle || '',
      description: entry.description || '',
      thumbnailUrl: entry.thumbnailUrl,
      video1Title: entry.videos[0]?.title || '',
      video1Url: entry.videos[0]?.youtubeId || '',
      video2Title: entry.videos[1]?.title || '',
      video2Url: entry.videos[1]?.youtubeId || '',
      sortOrder: entry.sortOrder,
      isPublished: entry.isPublished,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('정말로 이 카드를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setDeletingEntryId(entryId);
    try {
      const response = await fetch('/api/naraddon-tube/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword, entryId }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || '카드를 삭제하지 못했습니다.');
      }

      setFormFeedback({ type: 'success', text: '카드가 삭제되었습니다.' });
      await fetchEntries();
    } catch (error) {
      console.error('[NaraddonTubeAdmin] delete', error);
      setFormFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.',
      });
    } finally {
      setDeletingEntryId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    resetForm();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adminPassword) {
      setFormFeedback({ type: 'error', text: '비밀번호 확인 후 다시 시도해 주세요.' });
      return;
    }

    const trimmedTitle = uploadForm.title.trim();
    const trimmedThumbnail = uploadForm.thumbnailUrl.trim();
    const video1 = uploadForm.video1Url.trim();
    const video2 = uploadForm.video2Url.trim();

    if (!trimmedTitle) {
      setFormFeedback({ type: 'error', text: '카드 제목을 입력해 주세요.' });
      return;
    }

    if (!trimmedThumbnail) {
      setFormFeedback({ type: 'error', text: '썸네일을 업로드해 주세요.' });
      return;
    }

    try {
      setIsSaving(true);
      setFormFeedback(null);

      if (editingEntry) {
        // 수정 모드
        const response = await fetch('/api/naraddon-tube/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: adminPassword,
            entryId: editingEntry._id,
            title: trimmedTitle,
            subtitle: uploadForm.subtitle.trim(),
            description: uploadForm.description.trim(),
            thumbnailUrl: trimmedThumbnail,
            oldThumbnailUrl: editingEntry.thumbnailUrl,
            sortOrder: Number.isFinite(uploadForm.sortOrder) ? uploadForm.sortOrder : 0,
            isPublished: uploadForm.isPublished,
            videos: [
              ...(video1 ? [{ title: uploadForm.video1Title.trim(), youtubeUrl: video1 }] : []),
              ...(video2 ? [{ title: uploadForm.video2Title.trim(), youtubeUrl: video2 }] : []),
            ],
          }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || '수정에 실패했습니다.');
        }

        setFormFeedback({ type: 'success', text: '수정이 완료되었습니다.' });
        setEditingEntry(null);
      } else {
        // 등록 모드
        const response = await fetch('/api/naraddon-tube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: adminPassword,
            title: trimmedTitle,
            subtitle: uploadForm.subtitle.trim(),
            description: uploadForm.description.trim(),
            thumbnailUrl: trimmedThumbnail,
            sortOrder: Number.isFinite(uploadForm.sortOrder) ? uploadForm.sortOrder : 0,
            isPublished: uploadForm.isPublished,
            videos: [
              ...(video1 ? [{ title: uploadForm.video1Title.trim(), youtubeUrl: video1 }] : []),
              ...(video2 ? [{ title: uploadForm.video2Title.trim(), youtubeUrl: video2 }] : []),
            ],
          }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || '콘텐츠 생성에 실패했습니다.');
        }

        setFormFeedback({ type: 'success', text: '등록이 완료되었습니다.' });
      }

      setPendingThumbnailKey(null);
      await fetchEntries();
      await resetForm({ preserveThumbnail: true });
    } catch (error) {
      console.error('[NaraddonTubeAdmin] save', error);
      setFormFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : '작업 중 오류가 발생했습니다.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualRefresh = async () => {
    await fetchEntries();
    setFormFeedback(null);
  };

  if (isLoadingPassword) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">인증 확인 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">나라똔튜브 관리</h1>
        <p className="text-gray-600">
          썸네일 업로드와 영상 등록을 관리할 수 있습니다.
        </p>
      </div>

      {/* Upload/Edit Form */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {editingEntry ? '나라똔튜브 카드 수정' : '새로운 나라똔튜브 카드 등록'}
          </h2>
          <p className="text-sm text-gray-600">
            {editingEntry
              ? '수정할 내용을 변경한 후 수정하기 버튼을 눌러 주세요.'
              : '썸네일을 업로드하고 영상 링크 두 개를 입력한 뒤 등록 버튼을 눌러 주세요.'}
          </p>
          {editingEntry && (
            <button
              type="button"
              className="mt-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              onClick={handleCancelEdit}
            >
              수정 취소
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tube-card-title" className="block text-sm font-medium text-gray-700 mb-1">
                카드 제목
              </label>
              <input
                id="tube-card-title"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={uploadForm.title}
                onChange={(event) => updateFormField('title', event.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="tube-card-subtitle" className="block text-sm font-medium text-gray-700 mb-1">
                서브 타이틀 (선택)
              </label>
              <input
                id="tube-card-subtitle"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={uploadForm.subtitle}
                onChange={(event) => updateFormField('subtitle', event.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="tube-card-description" className="block text-sm font-medium text-gray-700 mb-1">
                설명 (선택)
              </label>
              <textarea
                id="tube-card-description"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={uploadForm.description}
                onChange={(event) => updateFormField('description', event.target.value)}
                rows={3}
              />
            </div>

            <div>
              <label htmlFor="tube-card-sort" className="block text-sm font-medium text-gray-700 mb-1">
                노출 우선순위 (숫자가 낮을수록 먼저 노출)
              </label>
              <input
                id="tube-card-sort"
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={uploadForm.sortOrder}
                min={0}
                onChange={(event) => updateFormField('sortOrder', Number(event.target.value))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">공개 상태</label>
              <label className="flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                <span className="text-sm text-gray-700">
                  {uploadForm.isPublished ? '바로 공개' : '임시 저장'}
                </span>
                <input
                  type="checkbox"
                  checked={uploadForm.isPublished}
                  onChange={(event) => updateFormField('isPublished', event.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </label>
            </div>
          </div>

          {/* Thumbnail Upload */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <div>
              <label htmlFor="tube-thumbnail" className="block text-sm font-medium text-gray-700 mb-1">
                썸네일 이미지 업로드
              </label>
              <input
                id="tube-thumbnail"
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleThumbnailSelect}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingThumbnail}
              >
                {isUploadingThumbnail ? '업로드 중...' : '이미지 선택'}
              </button>

              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => void clearThumbnailSelection()}
                disabled={isUploadingThumbnail || !uploadForm.thumbnailUrl}
              >
                썸네일 초기화
              </button>
            </div>

            {uploadForm.thumbnailUrl && (
              <div className="mt-4">
                <img
                  src={uploadForm.thumbnailUrl}
                  alt="나라똔튜브 썸네일 미리보기"
                  className="max-w-full h-auto rounded-md border border-gray-200"
                />
              </div>
            )}

            {thumbnailFeedback && (
              <p
                className={`text-sm ${
                  thumbnailFeedback.type === 'error' ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {thumbnailFeedback.text}
              </p>
            )}
          </div>

          {/* Video Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tube-video-1-title" className="block text-sm font-medium text-gray-700 mb-1">
                영상 1 제목 (선택)
              </label>
              <input
                id="tube-video-1-title"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={uploadForm.video1Title}
                onChange={(event) => updateFormField('video1Title', event.target.value)}
              />
            </div>

            <div>
              <label htmlFor="tube-video-1-url" className="block text-sm font-medium text-gray-700 mb-1">
                영상 1 YouTube 링크 또는 ID (선택)
              </label>
              <input
                id="tube-video-1-url"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={uploadForm.video1Url}
                onChange={(event) => updateFormField('video1Url', event.target.value)}
                placeholder="영상 준비 중인 경우 비워두세요"
              />
            </div>

            <div>
              <label htmlFor="tube-video-2-title" className="block text-sm font-medium text-gray-700 mb-1">
                영상 2 제목 (선택)
              </label>
              <input
                id="tube-video-2-title"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={uploadForm.video2Title}
                onChange={(event) => updateFormField('video2Title', event.target.value)}
              />
            </div>

            <div>
              <label htmlFor="tube-video-2-url" className="block text-sm font-medium text-gray-700 mb-1">
                영상 2 YouTube 링크 또는 ID (선택)
              </label>
              <input
                id="tube-video-2-url"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={uploadForm.video2Url}
                onChange={(event) => updateFormField('video2Url', event.target.value)}
                placeholder="영상 준비 중인 경우 비워두세요"
              />
            </div>
          </div>

          {formFeedback && (
            <p
              className={`text-sm ${
                formFeedback.type === 'error' ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {formFeedback.text}
            </p>
          )}

          {/* Form Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => void resetForm()}
              disabled={isSaving || isUploadingThumbnail}
            >
              입력 초기화
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? '처리 중...' : editingEntry ? '수정하기' : '등록하기'}
            </button>
          </div>
        </form>
      </div>

      {/* Entries List */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">등록된 카드 현황</h2>
            <p className="text-sm text-gray-600">
              최신 순으로 정렬하려면 우선순위를 조정해 주세요. 임시 저장 상태는 회색 뱃지로 표시됩니다.
            </p>
          </div>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            onClick={() => void handleManualRefresh()}
          >
            새로고침
          </button>
        </div>

        {isLoadingEntries && <p className="text-gray-500">목록을 불러오는 중입니다...</p>}

        {loadEntriesError && (
          <p className="text-sm text-red-600">{loadEntriesError}</p>
        )}

        {!isLoadingEntries && !formattedEntries.length && !loadEntriesError && (
          <p className="text-gray-500 text-center py-8">아직 등록된 카드가 없습니다.</p>
        )}

        {!isLoadingEntries && formattedEntries.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    제목
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    우선순위
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    공개
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    등록일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    영상 수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formattedEntries.map((entry) => {
                  const created = entry.createdAt ? new Date(entry.createdAt) : null;
                  const formattedDate = created
                    ? created.toLocaleString('ko-KR', { hour12: false })
                    : '-';
                  return (
                    <tr key={entry._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.sortOrder}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            entry.isPublished
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {entry.isPublished ? '공개' : '임시'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formattedDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.videos?.length ?? 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleEditEntry(entry)}
                            disabled={isSaving || isUploadingThumbnail}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleDeleteEntry(entry._id)}
                            disabled={isSaving || isUploadingThumbnail || deletingEntryId === entry._id}
                          >
                            {deletingEntryId === entry._id ? '삭제 중...' : '삭제'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default NaraddonTubeAdminPage;
