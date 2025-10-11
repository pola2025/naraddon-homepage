'use client';

/**
 * 기업심사관 블랙리스트 관리 페이지
 *
 * @purpose 문제 고객 정보를 심사관들이 공유
 * @access 기업심사관만 접근 가능
 * @features 등록, 조회, 수정, 삭제, 메모 추가
 */

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Memo {
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

interface BlacklistEntry {
  _id: string;
  customerName: string;
  phoneNumber: string;
  companyName?: string;
  businessNumber?: string;
  reason?: string;
  registeredBy: string;
  registeredByName: string;
  registeredAt: string;
  memos: Memo[];
  updatedAt?: string;
  updatedByName?: string;
}

interface FormData {
  customerName: string;
  phoneNumber: string;
  companyName: string;
  businessNumber: string;
  reason: string;
}

const initialFormData: FormData = {
  customerName: '',
  phoneNumber: '',
  companyName: '',
  businessNumber: '',
  reason: '',
};

export default function ExaminerBlacklistPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 상태 관리
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // 폼 상태
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // 모달 상태
  const [selectedEntry, setSelectedEntry] = useState<BlacklistEntry | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // 메모 상태
  const [memoContent, setMemoContent] = useState('');
  const [isAddingMemo, setIsAddingMemo] = useState(false);

  // 권한 체크
  useEffect(() => {
    if (status === 'loading') return;

    if (!session || session.user?.role !== 'examiner') {
      alert('기업심사관만 접근 가능합니다.');
      router.push('/');
    }
  }, [session, status, router]);

  // 데이터 조회
  useEffect(() => {
    if (session?.user?.role === 'examiner') {
      fetchEntries();
    }
  }, [session]);

  const fetchEntries = async (search = '') => {
    try {
      setLoading(true);
      const url = search
        ? `/api/examiner/blacklist?search=${encodeURIComponent(search)}`
        : '/api/examiner/blacklist';

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setEntries(data.entries || []);
      } else {
        console.error('Failed to fetch blacklist:', data.error);
      }
    } catch (error) {
      console.error('Error fetching blacklist:', error);
    } finally {
      setLoading(false);
    }
  };

  // 검색 처리
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEntries(searchQuery);
  };

  // 등록 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
    if (!formData.customerName.trim() || !formData.phoneNumber.trim()) {
      setFormError('이름과 연락처는 필수입니다.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');
      setFormSuccess('');

      const response = await fetch('/api/examiner/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setFormSuccess('블랙리스트에 등록되었습니다.');
        setFormData(initialFormData);
        fetchEntries(searchQuery);
      } else if (response.status === 409) {
        // 중복 에러
        const { duplicate } = data;
        setFormError(
          `이미 등록된 고객입니다.\n` +
          `일치 항목: ${duplicate.matches.join(', ')}\n` +
          `등록자: ${duplicate.registeredByName}\n` +
          `등록일: ${new Date(duplicate.registeredAt).toLocaleDateString('ko-KR')}`
        );
      } else {
        setFormError(data.error || '등록 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error submitting blacklist:', error);
      setFormError('등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 수정 모달 열기
  const handleEditClick = (entry: BlacklistEntry) => {
    setSelectedEntry(entry);
    setFormData({
      customerName: entry.customerName,
      phoneNumber: entry.phoneNumber,
      companyName: entry.companyName || '',
      businessNumber: entry.businessNumber || '',
      reason: entry.reason || '',
    });
    setIsEditModalOpen(true);
    setFormError('');
    setFormSuccess('');
  };

  // 수정 처리
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEntry) return;

    try {
      setIsSubmitting(true);
      setFormError('');
      setFormSuccess('');

      const response = await fetch(`/api/examiner/blacklist/${selectedEntry._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setFormSuccess('블랙리스트가 수정되었습니다.');
        setIsEditModalOpen(false);
        setFormData(initialFormData);
        fetchEntries(searchQuery);
      } else if (response.status === 409) {
        const { duplicate } = data;
        setFormError(
          `이미 등록된 고객입니다.\n` +
          `일치 항목: ${duplicate.matches.join(', ')}\n` +
          `등록자: ${duplicate.registeredByName}`
        );
      } else {
        setFormError(data.error || '수정 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error updating blacklist:', error);
      setFormError('수정 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 삭제 처리
  const handleDelete = async (entry: BlacklistEntry) => {
    if (!confirm(`${entry.customerName} 고객을 블랙리스트에서 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/examiner/blacklist/${entry._id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        alert('블랙리스트에서 삭제되었습니다.');
        fetchEntries(searchQuery);
      } else {
        alert(data.error || '삭제 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error deleting blacklist:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 상세보기 모달 열기
  const handleDetailClick = (entry: BlacklistEntry) => {
    setSelectedEntry(entry);
    setIsDetailModalOpen(true);
    setMemoContent('');
  };

  // 메모 추가
  const handleAddMemo = async () => {
    if (!selectedEntry || !memoContent.trim()) return;

    try {
      setIsAddingMemo(true);

      const response = await fetch(`/api/examiner/blacklist/${selectedEntry._id}/memo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: memoContent }),
      });

      const data = await response.json();

      if (response.ok) {
        // 메모 추가 성공 - 목록 새로고침
        await fetchEntries(searchQuery);

        // 상세보기 모달 데이터 업데이트
        const updatedEntry = entries.find(e => e._id === selectedEntry._id);
        if (updatedEntry) {
          setSelectedEntry(updatedEntry);
        }

        setMemoContent('');
        alert('메모가 추가되었습니다.');
      } else {
        alert(data.error || '메모 추가 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error adding memo:', error);
      alert('메모 추가 중 오류가 발생했습니다.');
    } finally {
      setIsAddingMemo(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (!session || session.user?.role !== 'examiner') {
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">블랙리스트 고객 관리</h1>
        <p className="text-gray-600">
          문제 고객 정보를 등록하고 심사관들과 공유합니다.
        </p>
      </div>

      {/* 등록 폼 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">새 고객 등록</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                연락처 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="010-1234-5678"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                회사명
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                사업자등록번호
              </label>
              <input
                type="text"
                value={formData.businessNumber}
                onChange={(e) => setFormData({ ...formData, businessNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="123-45-67890"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                등록 사유
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="등록 사유를 입력하세요..."
              />
            </div>
          </div>

          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded whitespace-pre-line">
              {formError}
            </div>
          )}

          {formSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {formSuccess}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setFormData(initialFormData);
                setFormError('');
                setFormSuccess('');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={isSubmitting}
            >
              초기화
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? '등록 중...' : '등록하기'}
            </button>
          </div>
        </form>
      </div>

      {/* 검색 및 목록 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">등록된 블랙리스트</h2>

          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이름, 연락처, 회사명 검색..."
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              검색
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                fetchEntries('');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              초기화
            </button>
          </form>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            등록된 블랙리스트가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">연락처</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">회사명</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">등록자</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">등록일</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">작업</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.customerName}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{entry.phoneNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{entry.companyName || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{entry.registeredByName}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(entry.registeredAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleDetailClick(entry)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          상세
                        </button>
                        <button
                          onClick={() => handleEditClick(entry)}
                          className="text-green-600 hover:text-green-900"
                        >
                          수정
                        </button>
                        {session.user.id === entry.registeredBy && (
                          <button
                            onClick={() => handleDelete(entry)}
                            className="text-red-600 hover:text-red-900"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 상세보기 모달 */}
      {isDetailModalOpen && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">블랙리스트 상세 정보</h3>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">이름</label>
                <p className="mt-1 text-lg text-gray-900">{selectedEntry.customerName}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">연락처</label>
                <p className="mt-1 text-lg text-gray-900">{selectedEntry.phoneNumber}</p>
              </div>

              {selectedEntry.companyName && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">회사명</label>
                  <p className="mt-1 text-lg text-gray-900">{selectedEntry.companyName}</p>
                </div>
              )}

              {selectedEntry.businessNumber && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">사업자등록번호</label>
                  <p className="mt-1 text-lg text-gray-900">{selectedEntry.businessNumber}</p>
                </div>
              )}

              {selectedEntry.reason && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">등록 사유</label>
                  <p className="mt-1 text-gray-900 whitespace-pre-wrap">{selectedEntry.reason}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-500">등록자</label>
                  <p className="mt-1 text-gray-900">{selectedEntry.registeredByName}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">등록일</label>
                  <p className="mt-1 text-gray-900">
                    {new Date(selectedEntry.registeredAt).toLocaleString('ko-KR')}
                  </p>
                </div>
              </div>

              {/* 메모 섹션 */}
              <div className="pt-4 border-t">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">메모</h4>

                {/* 메모 추가 폼 */}
                <div className="mb-4">
                  <textarea
                    value={memoContent}
                    onChange={(e) => setMemoContent(e.target.value)}
                    placeholder="새 메모를 입력하세요... (최대 500자)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    maxLength={500}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-500">{memoContent.length}/500</span>
                    <button
                      onClick={handleAddMemo}
                      disabled={!memoContent.trim() || isAddingMemo}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isAddingMemo ? '추가 중...' : '메모 추가'}
                    </button>
                  </div>
                </div>

                {/* 메모 목록 */}
                {selectedEntry.memos && selectedEntry.memos.length > 0 ? (
                  <div className="space-y-3">
                    {selectedEntry.memos.map((memo, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-900">{memo.content}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>{memo.createdByName}</span>
                          <span>•</span>
                          <span>{new Date(memo.createdAt).toLocaleString('ko-KR')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">등록된 메모가 없습니다.</p>
                )}
              </div>
            </div>

            <div className="p-6 border-t">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {isEditModalOpen && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">블랙리스트 수정</h3>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setFormData(initialFormData);
                    setFormError('');
                    setFormSuccess('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    연락처 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    회사명
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    사업자등록번호
                  </label>
                  <input
                    type="text"
                    value={formData.businessNumber}
                    onChange={(e) => setFormData({ ...formData, businessNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    등록 사유
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded whitespace-pre-line">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  {formSuccess}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setFormData(initialFormData);
                    setFormError('');
                    setFormSuccess('');
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  disabled={isSubmitting}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '수정 중...' : '수정하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
