'use client';

import React, { useState } from 'react';
import Image from 'next/image';

/**
 * 성공케이스 편집 컴포넌트 (게시판 형태)
 *
 * @purpose 심사관이 성공케이스를 게시판 형태로 작성 및 관리
 * @context 사용자 요청: "성공케이스는 게시판 형태로 작성 (이미지 업로드 1:1 썸네일 사이즈 이미지 리스트 노출)"
 * @decision
 *   - 게시판 스타일 UI (제목, 클라이언트, 내용, 썸네일 이미지)
 *   - 1:1 비율 썸네일 이미지 업로드
 *   - 이미지 리스트 그리드 형태 노출
 *   - Cloudflare R2 업로드 사용 (기존 examiner 이미지 업로드 API 재사용)
 */

interface SuccessCase {
  title: string;
  client?: string;
  content: string;
  thumbnail?: string;
  date: Date;
}

interface SuccessCaseEditorProps {
  successCases: SuccessCase[];
  onChange: (successCases: SuccessCase[]) => void;
}

export default function SuccessCaseEditor({ successCases, onChange }: SuccessCaseEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // 새 케이스 작성용 임시 state
  const [newCase, setNewCase] = useState<SuccessCase>({
    title: '',
    client: '',
    content: '',
    thumbnail: '',
    date: new Date(),
  });

  /**
   * 새 성공케이스 작성 모드 시작
   *
   * @purpose 작성 폼 표시
   */
  const startCreating = () => {
    setNewCase({
      title: '',
      client: '',
      content: '',
      thumbnail: '',
      date: new Date(),
    });
    setIsCreating(true);
    setEditingIndex(null);
  };

  /**
   * 새 성공케이스 저장
   *
   * @purpose 작성한 케이스를 리스트에 추가
   */
  const saveNewCase = () => {
    if (!newCase.title.trim() || !newCase.content.trim()) {
      alert('제목과 내용은 필수입니다.');
      return;
    }

    const updated = [...successCases, { ...newCase, date: new Date() }];
    onChange(updated);
    setIsCreating(false);
    setNewCase({
      title: '',
      client: '',
      content: '',
      thumbnail: '',
      date: new Date(),
    });
  };

  /**
   * 새 케이스 작성 취소
   */
  const cancelCreating = () => {
    setIsCreating(false);
    setNewCase({
      title: '',
      client: '',
      content: '',
      thumbnail: '',
      date: new Date(),
    });
  };

  /**
   * 성공케이스 수정
   *
   * @purpose 특정 인덱스의 성공케이스 정보 업데이트
   */
  const updateSuccessCase = (index: number, field: keyof SuccessCase, value: any) => {
    const updated = [...successCases];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  /**
   * 성공케이스 삭제
   *
   * @purpose 특정 인덱스의 성공케이스 제거
   */
  const deleteSuccessCase = (index: number) => {
    if (confirm('이 성공케이스를 삭제하시겠습니까?')) {
      const updated = successCases.filter((_, i) => i !== index);
      onChange(updated);
      if (editingIndex === index) {
        setEditingIndex(null);
      }
    }
  };

  /**
   * 편집 모드 토글
   */
  const toggleEdit = (index: number) => {
    if (editingIndex === index) {
      setEditingIndex(null);
    } else {
      setEditingIndex(index);
      setIsCreating(false);
    }
  };

  /**
   * 수정 사항 저장
   */
  const saveEdit = (index: number) => {
    const caseToSave = successCases[index];
    if (!caseToSave.title.trim() || !caseToSave.content.trim()) {
      alert('제목과 내용은 필수입니다.');
      return;
    }
    setEditingIndex(null);
    alert('수정사항이 저장되었습니다. 페이지 상단의 "저장" 버튼을 클릭하여 최종 저장하세요.');
  };

  /**
   * 새 케이스의 썸네일 업로드
   */
  const handleNewCaseThumbnailUpload = async (file: File) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', 'success-case-thumbnail');

      const response = await fetch('/api/examiner/brand/upload-success-thumbnail', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('이미지 업로드에 실패했습니다.');
      }

      const data = await response.json();
      if (data.success && data.imageUrl) {
        setNewCase({ ...newCase, thumbnail: data.imageUrl });
        alert('썸네일이 업로드되었습니다.');
      } else {
        throw new Error(data.error || '업로드 실패');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      alert(error instanceof Error ? error.message : '이미지 업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  /**
   * 썸네일 이미지 업로드
   *
   * @purpose 1:1 비율 썸네일 이미지를 Cloudflare R2에 업로드
   * @context 기존 /api/examiner/brand/upload-landing-image API 재사용
   * @note Sharp로 1:1 크롭 및 압축 (1920x1920 → 600x600)
   */
  const handleImageUpload = async (index: number, file: File) => {
    if (!file) return;

    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    // 이미지 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    try {
      setUploading(true);
      setUploadingIndex(index);

      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', 'success-case-thumbnail'); // 성공케이스 썸네일 타입

      const response = await fetch('/api/examiner/brand/upload-success-thumbnail', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('이미지 업로드에 실패했습니다.');
      }

      const data = await response.json();
      if (data.success && data.imageUrl) {
        updateSuccessCase(index, 'thumbnail', data.imageUrl);
        alert('썸네일이 업로드되었습니다.');
      } else {
        throw new Error(data.error || '업로드 실패');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      alert(error instanceof Error ? error.message : '이미지 업로드 실패');
    } finally {
      setUploading(false);
      setUploadingIndex(null);
    }
  };

  /**
   * 파일 선택 핸들러
   */
  const handleFileChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(index, file);
    }
  };

  return (
    <div className="space-y-6">
      {/* 안내 메시지 */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <i className="fas fa-info-circle mr-2"></i>
          성공케이스를 게시판 형태로 작성하세요. 1:1 비율의 썸네일 이미지를 업로드하면 자동으로 크롭됩니다.
        </p>
      </div>

      {/* 성공케이스 리스트 (게시판 스타일) */}
      <div className="space-y-3">
        {successCases.map((successCase, index) => (
          <div
            key={index}
            className="border border-gray-300 rounded-lg overflow-hidden bg-white hover:shadow-sm transition-shadow"
          >
            {/* 헤더 (항상 표시) */}
            <div className="flex items-center justify-between p-4 bg-white">
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                {/* 썸네일 미리보기 (작은 크기) */}
                {successCase.thumbnail ? (
                  <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0 border border-gray-200">
                    <Image
                      src={successCase.thumbnail}
                      alt={successCase.title || '썸네일'}
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
                    <i className="fas fa-image text-gray-400 text-xl"></i>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-semibold text-gray-900 truncate">
                    {successCase.title || '제목 미입력'}
                  </h4>
                  {successCase.client && (
                    <p className="text-sm text-gray-600 mt-1">{successCase.client}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                    {successCase.content || '내용 없음'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  type="button"
                  onClick={() => toggleEdit(index)}
                  className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <i className={`fas ${editingIndex === index ? 'fa-chevron-up' : 'fa-edit'} mr-1`}></i>
                  {editingIndex === index ? '닫기' : '수정'}
                </button>
                <button
                  type="button"
                  onClick={() => deleteSuccessCase(index)}
                  className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <i className="fas fa-trash mr-1"></i>
                  삭제
                </button>
              </div>
            </div>

            {/* 수정 폼 (펼쳐질 때만 표시) */}
            {editingIndex === index && (
              <div className="p-6 bg-gray-50 border-t border-gray-200">
                <div className="space-y-4">
                  {/* 썸네일 이미지 업로드 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      썸네일 이미지 (1:1 비율)
                    </label>
                    <div className="flex items-center space-x-4">
                      {successCase.thumbnail && (
                        <div className="w-32 h-32 rounded overflow-hidden flex-shrink-0 border border-gray-300">
                          <Image
                            src={successCase.thumbnail}
                            alt="썸네일 미리보기"
                            width={128}
                            height={128}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(index, e)}
                          disabled={uploading && uploadingIndex === index}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          {uploading && uploadingIndex === index ? (
                            <span className="text-blue-600">
                              <i className="fas fa-spinner fa-spin mr-1"></i>
                              업로드 중...
                            </span>
                          ) : (
                            '권장: 정사각형 이미지 (1:1 비율), 최대 10MB'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 제목 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      제목 *
                    </label>
                    <input
                      type="text"
                      value={successCase.title}
                      onChange={(e) => updateSuccessCase(index, 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="예: 스타트업 A사 R&D 자금 조달 성공"
                    />
                  </div>

                  {/* 클라이언트 (선택사항) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      클라이언트 (선택사항)
                    </label>
                    <input
                      type="text"
                      value={successCase.client || ''}
                      onChange={(e) => updateSuccessCase(index, 'client', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="예: ㈜테크스타트업"
                    />
                  </div>

                  {/* 내용 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      내용 *
                    </label>
                    <textarea
                      value={successCase.content}
                      onChange={(e) => updateSuccessCase(index, 'content', e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="성공케이스의 상세 내용을 작성하세요. 어떤 문제가 있었고, 어떻게 해결했는지, 결과는 어땠는지 등을 포함하세요."
                    />
                  </div>

                  {/* 저장 버튼 */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setEditingIndex(null)}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEdit(index)}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <i className="fas fa-check mr-2"></i>
                      수정 완료
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 새 성공케이스 작성 */}
      {isCreating ? (
        <div className="border border-blue-300 rounded-lg p-6 bg-blue-50">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">
            <i className="fas fa-plus-circle mr-2 text-blue-600"></i>
            새 성공케이스 작성
          </h3>
          <div className="space-y-4">
            {/* 썸네일 업로드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                썸네일 이미지 (1:1 비율)
              </label>
              <div className="flex items-center space-x-4">
                {newCase.thumbnail && (
                  <div className="w-32 h-32 rounded overflow-hidden flex-shrink-0 border border-gray-300">
                    <img
                      src={newCase.thumbnail}
                      alt="썸네일 미리보기"
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleNewCaseThumbnailUpload(file);
                    }}
                    disabled={uploading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {uploading ? (
                      <span className="text-blue-600">
                        <i className="fas fa-spinner fa-spin mr-1"></i>
                        업로드 중...
                      </span>
                    ) : (
                      '권장: 정사각형 이미지 (1:1 비율), 최대 10MB'
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* 제목 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제목 *
              </label>
              <input
                type="text"
                value={newCase.title}
                onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="예: 스타트업 A사 R&D 자금 조달 성공"
              />
            </div>

            {/* 클라이언트 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                클라이언트 (선택사항)
              </label>
              <input
                type="text"
                value={newCase.client || ''}
                onChange={(e) => setNewCase({ ...newCase, client: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="예: ㈜테크스타트업"
              />
            </div>

            {/* 내용 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                내용 *
              </label>
              <textarea
                value={newCase.content}
                onChange={(e) => setNewCase({ ...newCase, content: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="성공케이스의 상세 내용을 작성하세요."
              />
            </div>

            {/* 버튼 */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={cancelCreating}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={saveNewCase}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <i className="fas fa-plus mr-2"></i>
                추가하기
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={startCreating}
          className="w-full px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <i className="fas fa-plus-circle mr-2"></i>
          새 성공케이스 작성
        </button>
      )}

      {/* 안내 메시지 - 성공케이스가 없을 때 */}
      {!isCreating && successCases.length === 0 && (
        <div className="p-8 text-center bg-gray-50 rounded-lg">
          <i className="fas fa-trophy text-4xl text-gray-300 mb-4"></i>
          <p className="text-gray-600">
            아직 추가된 성공케이스가 없습니다.<br />
            "새 성공케이스 작성" 버튼을 클릭하여 성공케이스를 작성하세요.
          </p>
        </div>
      )}
    </div>
  );
}
