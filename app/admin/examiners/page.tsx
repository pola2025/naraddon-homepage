'use client';

import { useEffect, useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, UserIcon } from '@heroicons/react/24/outline';

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

export default function ExaminersPage() {
  const [examiners, setExaminers] = useState<Examiner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExaminer, setEditingExaminer] = useState<Examiner | null>(null);

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
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
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
                    onClick={() => handleOpenModal(examiner)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(examiner._id, examiner.name)}
                    className="text-red-600 hover:text-red-900"
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
    </div>
  );
}
