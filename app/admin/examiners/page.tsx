'use client';

import { useEffect, useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, UserIcon, EyeIcon } from '@heroicons/react/24/outline';

interface Examiner {
  _id: string;
  name: string;
  position: string;
  companyName: string;
  category: string;
  specialties: string[];
  imageUrl: string;
  userId: string | null;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ExaminerActivities {
  pageVisits: number;
  postsCreated: number;
  commentsCreated: number;
  consultationsAssigned: number;
  consultationsCompleted: number;
  loginCount: number;
  lastActiveAt: string | null;
}

interface ActivityScore {
  activities: ExaminerActivities;
  totalScore: number;
  scoreBreakdown: {
    pageVisits: number;
    postsCreated: number;
    commentsCreated: number;
    consultationsAssigned: number;
    consultationsCompleted: number;
    loginCount: number;
  };
}

export default function ExaminersPage() {
  const [examiners, setExaminers] = useState<Examiner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingExaminer, setEditingExaminer] = useState<Examiner | null>(null);
  const [viewingExaminer, setViewingExaminer] = useState<Examiner | null>(null);
  const [activityScore, setActivityScore] = useState<ActivityScore | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    position: '인증 기업심사관',
    companyName: '',
    category: 'funding',
    specialties: [] as string[],
    imageUrl: '',
    isPublished: true,
    sortOrder: 100 // 기본값: 100 (낮을수록 먼저 표시)
  });

  useEffect(() => {
    fetchExaminers();
  }, []);

  const fetchExaminers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/examiners');

      if (response.ok) {
        const data = await response.json();
        setExaminers(data.examiners || []);
      } else {
        alert('심사관 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to fetch examiners:', error);
      alert('심사관 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (examiner?: Examiner) => {
    if (examiner) {
      setEditingExaminer(examiner);
      setFormData({
        name: examiner.name,
        position: examiner.position,
        companyName: examiner.companyName,
        category: examiner.category,
        specialties: examiner.specialties || [],
        imageUrl: examiner.imageUrl,
        isPublished: examiner.isPublished,
        sortOrder: examiner.sortOrder
      });
      setPreviewImage(examiner.imageUrl || '');
    } else {
      // 새 심사관 추가 시: 현재 최대 sortOrder + 10
      const maxSortOrder = examiners.length > 0
        ? Math.max(...examiners.map(e => e.sortOrder || 0))
        : 0;
      const nextSortOrder = maxSortOrder + 10;

      setEditingExaminer(null);
      setFormData({
        name: '',
        position: '인증 기업심사관',
        companyName: '',
        category: 'funding',
        specialties: [],
        imageUrl: '',
        isPublished: true,
        sortOrder: nextSortOrder
      });
      setPreviewImage('');
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExaminer(null);
    setPreviewImage('');
    setUploadingImage(false);
  };

  const handleViewDetail = async (examiner: Examiner) => {
    setViewingExaminer(examiner);
    setShowDetailModal(true);
    setActivityScore(null);

    // 활동점수 가져오기
    if (examiner.userId) {
      try {
        setLoadingActivity(true);
        const response = await fetch(`/api/admin/examiners/${examiner._id}/activities`);

        if (response.ok) {
          const data = await response.json();
          setActivityScore(data);
        } else {
          console.error('Failed to fetch activity score');
        }
      } catch (error) {
        console.error('Error fetching activity score:', error);
      } finally {
        setLoadingActivity(false);
      }
    }
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setViewingExaminer(null);
    setActivityScore(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingExaminer
        ? `/api/admin/examiners/${editingExaminer._id}`
        : '/api/admin/examiners';

      const method = editingExaminer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert(editingExaminer ? '심사관 정보가 수정되었습니다.' : '심사관이 추가되었습니다.');
        handleCloseModal();
        fetchExaminers();
      } else {
        const data = await response.json();
        alert(data.error || '작업에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to save examiner:', error);
      alert('작업에 실패했습니다.');
    }
  };

  const handleDelete = async (examinerId: string, examinerName: string) => {
    if (!confirm(`${examinerName} 심사관을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/examiners/${examinerId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('심사관이 삭제되었습니다.');
        fetchExaminers();
      } else {
        const data = await response.json();
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete examiner:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleSpecialtyAdd = () => {
    const specialty = prompt('전문분야를 입력하세요:');
    if (specialty && specialty.trim()) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, specialty.trim()]
      }));
    }
  };

  const handleSpecialtyRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter((_, i) => i !== index)
    }));
  };

  /**
   * 이미지 파일 업로드 핸들러
   *
   * @purpose 선택한 이미지 파일을 Cloudflare R2에 업로드
   * @context 파일 선택 시 자동으로 업로드 진행
   */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    // 파일 크기 검증 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    try {
      setUploadingImage(true);

      // 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);

      // FormData 생성
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      // API 호출
      const response = await fetch('/api/upload/examiner', {
        method: 'POST',
        body: uploadFormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Image Upload] Full error response:', errorData);
        console.error('[Image Upload] Debug steps:', errorData.debug);
        console.error('[Image Upload] Last step:', errorData.lastStep);
        console.error('[Image Upload] Error message:', errorData.message);
        throw new Error(errorData.error || '업로드 실패');
      }

      const data = await response.json();

      // 업로드된 URL을 formData에 설정
      setFormData(prev => ({
        ...prev,
        imageUrl: data.url
      }));

      console.log('[Image Upload] Success:', data.url);
    } catch (error) {
      console.error('[Image Upload] Error:', error);
      alert(error instanceof Error ? error.message : '이미지 업로드 중 오류가 발생했습니다.');
      setPreviewImage('');
    } finally {
      setUploadingImage(false);
    }
  };

  /**
   * 이미지 제거 핸들러
   */
  const handleImageRemove = () => {
    setFormData(prev => ({
      ...prev,
      imageUrl: ''
    }));
    setPreviewImage('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">심사관 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            인증 기업심사관을 관리합니다
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          심사관 추가
        </button>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-sm text-gray-500">총 심사관 수</div>
        <div className="mt-1 text-3xl font-bold text-gray-900">{examiners.length}명</div>
      </div>

      {/* Examiners List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">순서</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">직책</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">회사</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">카테고리</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">전문분야</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">연결된 사용자</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">공개</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {examiners.map((examiner) => (
              <tr key={examiner._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {examiner.sortOrder}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {examiner.imageUrl ? (
                      <img
                        src={examiner.imageUrl}
                        alt={examiner.name}
                        onClick={() => handleViewDetail(examiner)}
                        className="w-10 h-10 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-blue-500 transition"
                        title="클릭하여 상세보기"
                      />
                    ) : (
                      <div
                        onClick={() => handleViewDetail(examiner)}
                        className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-500 transition"
                        title="클릭하여 상세보기"
                      >
                        <UserIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{examiner.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {examiner.position}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {examiner.companyName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {examiner.category}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {examiner.specialties && examiner.specialties.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {examiner.specialties.map((specialty, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">없음</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {examiner.userId ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      연결됨
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      미연결
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {examiner.isPublished ? (
                    <span className="text-green-600">공개</span>
                  ) : (
                    <span className="text-gray-400">비공개</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleViewDetail(examiner)}
                    className="text-gray-600 hover:text-gray-900 mr-3"
                    title="상세보기"
                  >
                    <EyeIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleOpenModal(examiner)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                    title="수정"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(examiner._id, examiner.name)}
                    className="text-red-600 hover:text-red-900"
                    title="삭제"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {examiners.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">등록된 심사관이 없습니다.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingExaminer ? '심사관 수정' : '심사관 추가'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">이름 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">직책</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">회사명 *</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">카테고리</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="funding">자금지원</option>
                    <option value="consulting">컨설팅</option>
                    <option value="legal">법률/특허</option>
                    <option value="marketing">마케팅</option>
                    <option value="tech">기술</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">전문분야</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.specialties.map((specialty, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {specialty}
                        <button
                          type="button"
                          onClick={() => handleSpecialtyRemove(idx)}
                          className="ml-2 text-blue-600 hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleSpecialtyAdd}
                    className="text-sm text-blue-600 hover:text-blue-900"
                  >
                    + 전문분야 추가
                  </button>
                </div>

                {/* 이미지 업로드 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">프로필 이미지</label>

                  {/* 미리보기 또는 기존 이미지 */}
                  {(previewImage || formData.imageUrl) && (
                    <div className="mb-4 relative inline-block">
                      <img
                        src={previewImage || formData.imageUrl}
                        alt="Preview"
                        className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={handleImageRemove}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-lg"
                        title="이미지 제거"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* 파일 업로드 버튼 */}
                  <div className="flex items-center space-x-3">
                    <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {uploadingImage ? '업로드 중...' : '이미지 선택'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </label>

                    {uploadingImage && (
                      <div className="flex items-center text-sm text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        업로드 중...
                      </div>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    JPG, PNG, WebP, GIF 파일 (최대 5MB)
                  </p>

                  {/* URL 직접 입력 (선택사항) */}
                  <details className="mt-3">
                    <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                      또는 URL 직접 입력
                    </summary>
                    <input
                      type="text"
                      value={formData.imageUrl}
                      onChange={(e) => {
                        setFormData({ ...formData, imageUrl: e.target.value });
                        setPreviewImage(e.target.value);
                      }}
                      className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      placeholder="https://example.com/image.jpg"
                    />
                  </details>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">정렬 순서</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    min="0"
                    step="10"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    숫자가 낮을수록 앞에 표시됩니다 (예: 10 → 20 → 30)
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">공개</label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    {editingExaminer ? '수정' : '추가'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal - 상세보기 */}
      {showDetailModal && viewingExaminer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-xs w-full max-h-[75vh] overflow-y-auto">
            <div className="p-3">
              {/* 상단 헤더와 닫기 버튼 */}
              <div className="flex items-center justify-between mb-2 sticky top-0 bg-white pb-2 border-b z-10">
                <h2 className="text-base font-bold text-gray-900">심사관 상세 정보</h2>
                <button
                  onClick={handleCloseDetailModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                  aria-label="닫기"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-2.5">
                {/* 프로필 이미지 - 사각형, 원본 비율, 작은 크기 */}
                <div className="flex justify-center py-1">
                  {viewingExaminer.imageUrl ? (
                    <img
                      src={viewingExaminer.imageUrl}
                      alt={viewingExaminer.name}
                      className="w-16 h-20 rounded object-cover border border-blue-100"
                    />
                  ) : (
                    <div className="w-16 h-20 rounded bg-gray-200 flex items-center justify-center border border-gray-100">
                      <UserIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* 기본 정보 */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">이름</label>
                    <p className="text-xs font-semibold text-gray-900">{viewingExaminer.name}</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">직책</label>
                    <p className="text-xs text-gray-900">{viewingExaminer.position}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">회사명</label>
                    <p className="text-xs text-gray-900">{viewingExaminer.companyName}</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">카테고리</label>
                    <p className="text-xs text-gray-900">{viewingExaminer.category}</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">순서</label>
                    <p className="text-xs text-gray-900">{viewingExaminer.sortOrder}</p>
                  </div>
                </div>

                {/* 전문분야 */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">전문분야</label>
                  {viewingExaminer.specialties && viewingExaminer.specialties.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {viewingExaminer.specialties.map((specialty, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-400">없음</p>
                  )}
                </div>

                {/* 상태 정보 */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">공개 여부</label>
                    <p className="text-sm">
                      {viewingExaminer.isPublished ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          공개
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          비공개
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">사용자 연결</label>
                    <p className="text-sm">
                      {viewingExaminer.userId ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          연결됨
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          미연결
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* 날짜 정보 */}
                <div className="border-t pt-2">
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <label className="block text-gray-500 mb-0.5">생성</label>
                      <p className="text-gray-700">
                        {viewingExaminer.createdAt
                          ? new Date(viewingExaminer.createdAt).toLocaleDateString('ko-KR')
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-gray-500 mb-0.5">수정</label>
                      <p className="text-gray-700">
                        {viewingExaminer.updatedAt
                          ? new Date(viewingExaminer.updatedAt).toLocaleDateString('ko-KR')
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 활동점수 (관리자 전용) */}
                {viewingExaminer.userId && (
                  <div className="border-t pt-2">
                    <h3 className="text-xs font-semibold text-gray-900 mb-2">활동점수</h3>
                    {loadingActivity ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : activityScore ? (
                      <div className="space-y-1.5">
                        {/* 총점 */}
                        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded p-2 text-white">
                          <div className="text-[10px] opacity-90">총점</div>
                          <div className="text-lg font-bold">{activityScore.totalScore.toLocaleString()}점</div>
                        </div>

                        {/* 활동 세부 내역 */}
                        <div className="grid grid-cols-3 gap-1.5">
                          <div className="bg-gray-50 p-1.5 rounded">
                            <div className="text-[9px] text-gray-500">방문</div>
                            <div className="text-xs font-semibold text-gray-900">
                              {activityScore.activities.pageVisits}
                            </div>
                          </div>
                          <div className="bg-gray-50 p-1.5 rounded">
                            <div className="text-[9px] text-gray-500">게시글</div>
                            <div className="text-xs font-semibold text-gray-900">
                              {activityScore.activities.postsCreated}
                            </div>
                          </div>
                          <div className="bg-gray-50 p-1.5 rounded">
                            <div className="text-[9px] text-gray-500">댓글</div>
                            <div className="text-xs font-semibold text-gray-900">
                              {activityScore.activities.commentsCreated}
                            </div>
                          </div>
                          <div className="bg-gray-50 p-1.5 rounded">
                            <div className="text-[9px] text-gray-500">배정</div>
                            <div className="text-xs font-semibold text-gray-900">
                              {activityScore.activities.consultationsAssigned}
                            </div>
                          </div>
                          <div className="bg-gray-50 p-1.5 rounded">
                            <div className="text-[9px] text-gray-500">완료</div>
                            <div className="text-xs font-semibold text-gray-900">
                              {activityScore.activities.consultationsCompleted}
                            </div>
                          </div>
                          <div className="bg-gray-50 p-1.5 rounded">
                            <div className="text-[9px] text-gray-500">로그인</div>
                            <div className="text-xs font-semibold text-gray-900">
                              {activityScore.activities.loginCount}
                            </div>
                          </div>
                        </div>

                        {/* 마지막 활동 */}
                        {activityScore.activities.lastActiveAt && (
                          <div className="text-xs text-gray-500 mt-1.5">
                            마지막 활동: {new Date(activityScore.activities.lastActiveAt).toLocaleString('ko-KR')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 text-center py-4">활동 내역이 없습니다.</p>
                    )}
                  </div>
                )}
              </div>

              {/* 닫기 버튼 */}
              <div className="flex justify-end space-x-1.5 pt-2 border-t mt-2">
                <button
                  onClick={handleCloseDetailModal}
                  className="px-2 py-1 border border-gray-300 rounded text-[10px] font-medium text-gray-700 hover:bg-gray-50"
                >
                  닫기
                </button>
                <button
                  onClick={() => {
                    handleCloseDetailModal();
                    handleOpenModal(viewingExaminer);
                  }}
                  className="px-2 py-1 border border-transparent rounded shadow-sm text-[10px] font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  수정
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
