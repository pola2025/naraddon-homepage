'use client';

import React, { useCallback, useEffect, useState } from 'react';

interface TubeVideo {
  title: string;
  description?: string;
  youtubeId: string;
  url: string;
  customThumbnail?: string;
}

interface TubeEntry {
  _id: string;
  videos: TubeVideo[];
  isPublished: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

interface VideoFormState {
  title: string;
  description: string;
  youtubeUrl: string;
  customThumbnail: string;
  sortOrder: number;
  isPublished: boolean;
}

const initialForm: VideoFormState = {
  title: '',
  description: '',
  youtubeUrl: '',
  customThumbnail: '',
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

  const [form, setForm] = useState<VideoFormState>(initialForm);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TubeEntry | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  const [thumbnailFeedback, setThumbnailFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [pendingThumbnailKey, setPendingThumbnailKey] = useState<string | null>(null);

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
        setFeedback({
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
        setEntries(data.entries);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingPassword, adminPassword]);

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

      setForm(initialForm);
      setThumbnailFeedback(null);
      setPendingThumbnailKey(null);
      setEditingEntry(null);
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
        setForm(prev => ({ ...prev, customThumbnail: publicUrl as string }));
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
    [adminPassword, deleteObjectFromR2, pendingThumbnailKey]
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
    setForm(prev => ({ ...prev, customThumbnail: '' }));
    setThumbnailFeedback(null);
  };

  const handleEditEntry = (entry: TubeEntry) => {
    setEditingEntry(entry);
    const video = entry.videos[0];
    setForm({
      title: video?.title || '',
      description: video?.description || '',
      youtubeUrl: video?.youtubeId || '',
      customThumbnail: video?.customThumbnail || '',
      sortOrder: entry.sortOrder,
      isPublished: entry.isPublished,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('정말로 이 영상을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
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
        throw new Error(data?.message || '영상을 삭제하지 못했습니다.');
      }

      setFeedback({ type: 'success', text: '영상이 삭제되었습니다.' });
      await fetchEntries();
    } catch (error) {
      console.error('[NaraddonTubeAdmin] delete', error);
      setFeedback({
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = form.title.trim();
    const trimmedYoutubeUrl = form.youtubeUrl.trim();

    if (!trimmedTitle) {
      setFeedback({ type: 'error', text: '영상 제목을 입력해 주세요.' });
      return;
    }

    if (!trimmedYoutubeUrl) {
      setFeedback({ type: 'error', text: 'YouTube URL을 입력해 주세요.' });
      return;
    }

    try {
      setIsSaving(true);
      setFeedback(null);

      if (editingEntry) {
        // 수정 모드
        const response = await fetch('/api/naraddon-tube/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: adminPassword || undefined,
            entryId: editingEntry._id,
            title: trimmedTitle,
            description: form.description.trim() || undefined,
            youtubeUrl: trimmedYoutubeUrl,
            customThumbnail: form.customThumbnail.trim() || undefined,
            oldCustomThumbnail: editingEntry.videos[0]?.customThumbnail,
            sortOrder: Number.isFinite(form.sortOrder) ? form.sortOrder : 0,
            isPublished: form.isPublished,
          }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || '수정에 실패했습니다.');
        }

        setFeedback({ type: 'success', text: '수정이 완료되었습니다.' });
        setEditingEntry(null);
      } else {
        // 등록 모드
        const response = await fetch('/api/naraddon-tube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: adminPassword || undefined,
            title: trimmedTitle,
            description: form.description.trim() || undefined,
            youtubeUrl: trimmedYoutubeUrl,
            customThumbnail: form.customThumbnail.trim() || undefined,
            sortOrder: Number.isFinite(form.sortOrder) ? form.sortOrder : 0,
            isPublished: form.isPublished,
          }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || '영상 등록에 실패했습니다.');
        }

        setFeedback({ type: 'success', text: '등록이 완료되었습니다.' });
      }

      setPendingThumbnailKey(null);
      await fetchEntries();
      await resetForm({ preserveThumbnail: true });
    } catch (error) {
      console.error('[NaraddonTubeAdmin] save', error);
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : '작업 중 오류가 발생했습니다.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualRefresh = async () => {
    await fetchEntries();
    setFeedback(null);
  };

  if (isLoadingPassword) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">인증 확인 중...</p>
      </div>
    );
  }

  const sortedEntries = [...entries].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">나라똔튜브 관리</h1>
        <p className="text-gray-600">
          영상을 등록하고 관리할 수 있습니다. 썸네일은 선택사항입니다.
        </p>
      </div>

      {/* Upload/Edit Form */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {editingEntry ? '영상 수정' : '새 영상 등록'}
          </h2>
          <p className="text-sm text-gray-600">
            {editingEntry
              ? '수정할 내용을 변경한 후 수정하기 버튼을 눌러 주세요.'
              : 'YouTube URL과 제목을 입력하세요. 썸네일은 선택사항입니다.'}
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
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="video-title" className="block text-sm font-medium text-gray-700 mb-1">
                영상 제목 *
              </label>
              <input
                id="video-title"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div>
              <label htmlFor="video-description" className="block text-sm font-medium text-gray-700 mb-1">
                영상 설명
              </label>
              <textarea
                id="video-description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="영상에 대한 간단한 설명을 입력하세요"
              />
            </div>

            <div>
              <label htmlFor="youtube-url" className="block text-sm font-medium text-gray-700 mb-1">
                YouTube URL 또는 ID *
              </label>
              <input
                id="youtube-url"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={form.youtubeUrl}
                onChange={(e) => setForm(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                placeholder="예: https://youtube.com/watch?v=..."
                required
              />
            </div>

            <div>
              <label htmlFor="sort-order" className="block text-sm font-medium text-gray-700 mb-1">
                정렬 순서 (숫자가 낮을수록 먼저 노출)
              </label>
              <input
                id="sort-order"
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={form.sortOrder}
                min={0}
                onChange={(e) => setForm(prev => ({ ...prev, sortOrder: Number(e.target.value) }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">공개 상태</label>
              <label className="flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                <span className="text-sm text-gray-700">
                  {form.isPublished ? '바로 공개' : '임시 저장'}
                </span>
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm(prev => ({ ...prev, isPublished: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </label>
            </div>
          </div>

          {/* Thumbnail Upload (Optional) */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <div>
              <label htmlFor="thumbnail" className="block text-sm font-medium text-gray-700 mb-1">
                커스텀 썸네일 (선택사항)
              </label>
              <p className="text-xs text-gray-500 mb-2">비어있으면 YouTube 기본 썸네일을 사용합니다</p>
              <input
                id="thumbnail"
                type="file"
                accept="image/*"
                onChange={handleThumbnailSelect}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => void clearThumbnailSelection()}
                disabled={isUploadingThumbnail || !form.customThumbnail}
              >
                썸네일 초기화
              </button>
            </div>

            {form.customThumbnail && (
              <div className="mt-4">
                <img
                  src={form.customThumbnail}
                  alt="썸네일 미리보기"
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

          {feedback && (
            <p
              className={`text-sm ${
                feedback.type === 'error' ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {feedback.text}
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
            <h2 className="text-xl font-semibold text-gray-900 mb-1">등록된 영상 목록</h2>
            <p className="text-sm text-gray-600">
              정렬 순서를 조정하여 노출 순서를 변경할 수 있습니다.
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

        {!isLoadingEntries && !sortedEntries.length && !loadEntriesError && (
          <p className="text-gray-500 text-center py-8">아직 등록된 영상이 없습니다.</p>
        )}

        {!isLoadingEntries && sortedEntries.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    제목
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    YouTube ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    공개
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    순서
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedEntries.map((entry) => {
                  const video = entry.videos[0];
                  return (
                    <tr key={entry._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {video?.title || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {video?.youtubeId || '-'}
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.sortOrder}
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
