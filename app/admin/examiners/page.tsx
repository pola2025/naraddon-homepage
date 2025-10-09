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

  const [formData, setFormData] = useState({
    name: '',
    position: '인증 기업심사관',
    companyName: '',
    category: 'funding',
    specialties: [] as string[],
    imageUrl: '',
    isPublished: true,
    sortOrder: 999
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
    } else {
      setEditingExaminer(null);
      setFormData({
        name: '',
        position: '인증 기업심사관',
        companyName: '',
        category: 'funding',
        specialties: [],
        imageUrl: '',
        isPublished: true,
        sortOrder: 999
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExaminer(null);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">심사관 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            인증 기업심사관을 관리합니다
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
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

                <div>
                  <label className="block text-sm font-medium text-gray-700">이미지 URL</label>
                  <input
                    type="text"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="/images/examiners/name.jpg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">정렬 순서</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-xl w-full max-h-[85vh] overflow-y-auto">
            <div className="p-4 sm:p-5">
              {/* 상단 헤더와 닫기 버튼 */}
              <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-3 border-b z-10">
                <h2 className="text-lg font-bold text-gray-900">심사관 상세 정보</h2>
                <button
                  onClick={handleCloseDetailModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                  aria-label="닫기"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* 프로필 이미지 */}
                <div className="flex justify-center">
                  {viewingExaminer.imageUrl ? (
                    <img
                      src={viewingExaminer.imageUrl}
                      alt={viewingExaminer.name}
                      className="w-28 h-28 rounded-full object-cover border-4 border-blue-100"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-100">
                      <UserIcon className="w-14 h-14 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* 기본 정보 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">이름</label>
                    <p className="text-sm font-semibold text-gray-900">{viewingExaminer.name}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">직책</label>
                    <p className="text-sm text-gray-900">{viewingExaminer.position}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">회사명</label>
                    <p className="text-sm text-gray-900">{viewingExaminer.companyName}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">카테고리</label>
                    <p className="text-sm text-gray-900">{viewingExaminer.category}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">정렬 순서</label>
                    <p className="text-sm text-gray-900">{viewingExaminer.sortOrder}</p>
                  </div>
                </div>

                {/* 전문분야 */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">전문분야</label>
                  {viewingExaminer.specialties && viewingExaminer.specialties.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {viewingExaminer.specialties.map((specialty, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">등록된 전문분야가 없습니다.</p>
                  )}
                </div>

                {/* 이미지 URL */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">이미지 URL</label>
                  <p className="text-xs text-gray-600 break-all bg-gray-50 p-1.5 rounded">
                    {viewingExaminer.imageUrl || '없음'}
                  </p>
                </div>

                {/* 상태 정보 */}
                <div className="grid grid-cols-2 gap-3">
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
                <div className="border-t pt-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-gray-500 mb-0.5">생성일</label>
                      <p className="text-gray-700">
                        {viewingExaminer.createdAt
                          ? new Date(viewingExaminer.createdAt).toLocaleString('ko-KR')
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-gray-500 mb-0.5">수정일</label>
                      <p className="text-gray-700">
                        {viewingExaminer.updatedAt
                          ? new Date(viewingExaminer.updatedAt).toLocaleString('ko-KR')
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 활동점수 (관리자 전용) */}
                {viewingExaminer.userId && (
                  <div className="border-t pt-3">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">활동점수 (관리자 전용)</h3>
                    {loadingActivity ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : activityScore ? (
                      <div className="space-y-2.5">
                        {/* 총점 */}
                        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-3 text-white">
                          <div className="text-xs opacity-90 mb-0.5">총 활동점수</div>
                          <div className="text-2xl font-bold">{activityScore.totalScore.toLocaleString()}점</div>
                        </div>

                        {/* 활동 세부 내역 */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-gray-50 p-2.5 rounded-lg">
                            <div className="text-[10px] text-gray-500 mb-0.5">페이지 방문</div>
                            <div className="text-sm font-semibold text-gray-900">
                              {activityScore.activities.pageVisits}회
                            </div>
                            <div className="text-[10px] text-blue-600 mt-0.5">
                              +{activityScore.scoreBreakdown.pageVisits}점
                            </div>
                          </div>
                          <div className="bg-gray-50 p-2.5 rounded-lg">
                            <div className="text-[10px] text-gray-500 mb-0.5">게시글 작성</div>
                            <div className="text-sm font-semibold text-gray-900">
                              {activityScore.activities.postsCreated}개
                            </div>
                            <div className="text-[10px] text-blue-600 mt-0.5">
                              +{activityScore.scoreBreakdown.postsCreated}점
                            </div>
                          </div>
                          <div className="bg-gray-50 p-2.5 rounded-lg">
                            <div className="text-[10px] text-gray-500 mb-0.5">댓글 작성</div>
                            <div className="text-sm font-semibold text-gray-900">
                              {activityScore.activities.commentsCreated}개
                            </div>
                            <div className="text-[10px] text-blue-600 mt-0.5">
                              +{activityScore.scoreBreakdown.commentsCreated}점
                            </div>
                          </div>
                          <div className="bg-gray-50 p-2.5 rounded-lg">
                            <div className="text-[10px] text-gray-500 mb-0.5">상담 배정</div>
                            <div className="text-sm font-semibold text-gray-900">
                              {activityScore.activities.consultationsAssigned}건
                            </div>
                            <div className="text-[10px] text-blue-600 mt-0.5">
                              +{activityScore.scoreBreakdown.consultationsAssigned}점
                            </div>
                          </div>
                          <div className="bg-gray-50 p-2.5 rounded-lg">
                            <div className="text-[10px] text-gray-500 mb-0.5">상담 완료</div>
                            <div className="text-sm font-semibold text-gray-900">
                              {activityScore.activities.consultationsCompleted}건
                            </div>
                            <div className="text-[10px] text-blue-600 mt-0.5">
                              +{activityScore.scoreBreakdown.consultationsCompleted}점
                            </div>
                          </div>
                          <div className="bg-gray-50 p-2.5 rounded-lg">
                            <div className="text-[10px] text-gray-500 mb-0.5">로그인</div>
                            <div className="text-sm font-semibold text-gray-900">
                              {activityScore.activities.loginCount}회
                            </div>
                            <div className="text-[10px] text-blue-600 mt-0.5">
                              +{activityScore.scoreBreakdown.loginCount}점
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
              <div className="flex justify-end space-x-2 pt-3 border-t mt-3">
                <button
                  onClick={handleCloseDetailModal}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  닫기
                </button>
                <button
                  onClick={() => {
                    handleCloseDetailModal();
                    handleOpenModal(viewingExaminer);
                  }}
                  className="px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  수정하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
