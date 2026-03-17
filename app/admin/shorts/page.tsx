'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';

interface ShortItem {
  _id: string;
  title: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export default function AdminShorts() {
  const [shorts, setShorts] = useState<ShortItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    youtubeUrl: '',
    thumbnailUrl: '',
    sortOrder: 0,
  });
  const [saving, setSaving] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchShorts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/shorts?all=1');
      const data = await res.json();
      setShorts(data.shorts || []);
    } catch (error) {
      console.error('Failed to fetch shorts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShorts();
  }, []);

  const resetForm = () => {
    setForm({ title: '', youtubeUrl: '', thumbnailUrl: '', sortOrder: 0 });
    setEditingId(null);
    setShowForm(false);
    setPendingFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let thumbnailUrl = form.thumbnailUrl;

      // 새 파일이 있으면 등록 시점에 업로드
      if (pendingFile) {
        const uploadData = new FormData();
        uploadData.append('file', pendingFile);
        const uploadRes = await fetch('/api/shorts/upload', { method: 'POST', body: uploadData });
        const uploadResult = await uploadRes.json();
        if (!uploadResult.success) {
          alert(uploadResult.error || '썸네일 업로드 실패');
          setSaving(false);
          return;
        }
        thumbnailUrl = uploadResult.url;
      }

      // 썸네일 없으면 서버에서 YouTube 기본 썸네일 자동 생성

      const url = editingId ? `/api/shorts/${editingId}` : '/api/shorts';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, thumbnailUrl }),
      });

      if (res.ok) {
        resetForm();
        fetchShorts();
      }
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: ShortItem) => {
    setForm({
      title: item.title,
      youtubeUrl: item.youtubeUrl,
      thumbnailUrl: item.thumbnailUrl,
      sortOrder: item.sortOrder,
    });
    setEditingId(item._id);
    setShowForm(true);
  };

  const handleToggleActive = async (item: ShortItem) => {
    try {
      await fetch(`/api/shorts/${item._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      fetchShorts();
    } catch (error) {
      console.error('Toggle failed:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await fetch(`/api/shorts/${id}`, { method: 'DELETE' });
      fetchShorts();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // 썸네일 파일 선택 (로컬 미리보기만, 업로드는 등록 시)
  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    // 기존 URL 클리어 (새 파일 우선)
    setForm((prev) => ({ ...prev, thumbnailUrl: '' }));
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Link href="/admin/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">
                  대시보드
                </Link>
                <span className="text-gray-300">/</span>
                <span className="text-sm text-gray-600">쇼츠 관리</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">쇼츠 관리</h1>
              <p className="mt-1 text-sm text-gray-500">
                메인 페이지 &quot;짧게 보는 정책자금 뉴스&quot; 섹션 콘텐츠를 관리합니다.
              </p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              + 새 쇼츠 등록
            </button>
          </div>

          {/* 등록/수정 폼 */}
          {showForm && (
            <div className="bg-white rounded-lg shadow mb-6 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {editingId ? '쇼츠 수정' : '새 쇼츠 등록'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    유튜브 쇼츠 URL
                  </label>
                  <input
                    type="url"
                    value={form.youtubeUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, youtubeUrl: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="https://youtube.com/shorts/..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    썸네일 업로드
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 transition-colors">
                      이미지 선택
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailSelect}
                        className="hidden"
                      />
                    </label>
                    {(previewUrl || form.thumbnailUrl) && (
                      <div className="flex items-center gap-2">
                        <img
                          src={previewUrl || form.thumbnailUrl}
                          alt="미리보기"
                          className="w-16 h-28 object-cover rounded border"
                        />
                        <span className="text-xs text-gray-500">
                          {pendingFile
                            ? `${pendingFile.name} (등록 시 WebP 변환)`
                            : 'WebP 변환 완료'}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    미선택 시 YouTube 기본 썸네일이 자동 적용됩니다. 직접 업로드하면 WebP
                    변환·압축됩니다.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">정렬 순서</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))
                    }
                    className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1">숫자가 작을수록 앞에 표시됩니다.</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {saving
                      ? pendingFile
                        ? '업로드+저장 중...'
                        : '저장 중...'
                      : editingId
                        ? '수정'
                        : '등록'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 목록 */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">불러오는 중...</div>
          ) : shorts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">등록된 쇼츠가 없습니다.</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-green-600 text-sm font-medium hover:text-green-700"
              >
                첫 쇼츠를 등록해보세요
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">순서</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">썸네일</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">제목</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">상태</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shorts.map((item) => (
                    <tr
                      key={item._id}
                      className={`hover:bg-gray-50 ${!item.isActive ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3 text-gray-600">{item.sortOrder}</td>
                      <td className="px-4 py-3">
                        <img
                          src={item.thumbnailUrl}
                          alt=""
                          className="w-12 h-20 object-cover rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{item.title}</div>
                        <a
                          href={item.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline"
                        >
                          {item.youtubeUrl.slice(0, 50)}...
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            item.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {item.isActive ? '활성' : '비활성'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
