'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

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

export default function NaraddonTubeAdminPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [entries, setEntries] = useState<TubeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // 실제 데이터 가져오기
  useEffect(() => {
    const fetchEntries = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/naraddon-tube?includeDraft=true', { cache: 'no-store' });

        if (!response.ok) {
          throw new Error('데이터를 불러오는데 실패했습니다.');
        }

        const data = await response.json();

        if (Array.isArray(data?.entries)) {
          setEntries(data.entries);
        } else {
          setEntries([]);
        }
      } catch (err) {
        console.error('[NaraddonTubeAdmin] fetch error:', err);
        setError(err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했습니다.');
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, []);

  // 검색 및 필터링
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.subtitle?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
                         entry.description?.toLowerCase()?.includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'published' && entry.isPublished) ||
                         (statusFilter === 'draft' && !entry.isPublished);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">나라똔튜브 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            영상 콘텐츠를 관리하고 새로운 영상을 업로드합니다.
          </p>
        </div>
        <Link
          href="/naraddon-tube/admin"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          새 영상 등록
        </Link>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="영상 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'draft')}
          >
            <option value="all">모든 상태</option>
            <option value="published">게시됨</option>
            <option value="draft">초안</option>
          </select>
        </div>
      </div>

      {/* 영상 목록 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading && (
          <div className="px-6 py-12 text-center text-gray-500">
            데이터를 불러오는 중...
          </div>
        )}

        {error && (
          <div className="px-6 py-12 text-center text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && filteredEntries.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">
            {searchTerm || statusFilter !== 'all'
              ? '검색 결과가 없습니다.'
              : '등록된 영상이 없습니다. 새로운 영상을 등록해주세요.'}
          </div>
        )}

        {!loading && !error && filteredEntries.length > 0 && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  카드 정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  영상 수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  우선순위
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  등록일
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEntries.map((entry) => (
                <tr key={entry._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-16 w-24 flex-shrink-0 mr-4">
                        <img
                          src={entry.thumbnailUrl}
                          alt={entry.title}
                          className="h-16 w-24 object-cover rounded-md"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{entry.title}</div>
                        {entry.subtitle && (
                          <div className="text-sm text-gray-500">{entry.subtitle}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.videos.length}개
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      entry.isPublished
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {entry.isPublished ? '게시됨' : '초안'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.sortOrder}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.createdAt
                      ? new Date(entry.createdAt).toLocaleDateString('ko-KR')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Link
                        href={`/naraddon-tube/admin`}
                        className="text-blue-600 hover:text-blue-900"
                        title="상세보기"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </Link>
                      <Link
                        href={`/naraddon-tube/admin`}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="수정하기"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </Link>
                      <button
                        className="text-red-600 hover:text-red-900"
                        title="삭제하기"
                        onClick={() => {
                          if (confirm(`"${entry.title}" 카드를 삭제하시겠습니까?`)) {
                            alert('삭제 기능은 /naraddon-tube/admin 페이지에서 이용 가능합니다.');
                          }
                        }}
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 통계 정보 */}
      {!loading && !error && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg">
          <div className="flex-1 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">
                전체 <span className="font-medium">{entries.length}</span>개 카드 |{' '}
                <span className="font-medium">{entries.filter(e => e.isPublished).length}</span>개 게시됨 |{' '}
                <span className="font-medium">{entries.filter(e => !e.isPublished).length}</span>개 임시저장
                {(searchTerm || statusFilter !== 'all') && (
                  <> | 검색결과 <span className="font-medium">{filteredEntries.length}</span>개</>
                )}
              </p>
            </div>
            <div className="text-sm text-gray-500">
              실제 업로드/수정/삭제는 <Link href="/naraddon-tube/admin" className="text-blue-600 hover:text-blue-800 font-medium">/naraddon-tube/admin</Link>에서 가능합니다
            </div>
          </div>
        </div>
      )}
    </div>
  );
}