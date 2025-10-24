/**
 * 심사관 브랜드 페이지 - 정책분석 탭 컴포넌트
 *
 * @purpose 심사관이 작성한 정책분석 글 목록을 동적으로 표시
 * @context 나라똔 정책분석 페이지(/policy-analysis)에서 작성한 글이 자동으로 리스팅됨
 * @decision 글이 없으면 "작성된 글이 없습니다" 메시지 표시
 * @integration 기존 /api/policy-analysis API 사용 (examinerKey로 필터링)
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface PolicyPost {
  _id: string;
  title: string;
  excerpt: string;
  category: string;
  thumbnail: string;
  createdAt: string;
  views: number;
  likes: number;
  examiner: {
    key: string;
    name: string;
    companyName: string;
  };
}

interface PolicyAnalysisTabProps {
  examinerKey: string; // ExpertExaminer.legacyKey
}

export default function PolicyAnalysisTab({ examinerKey }: PolicyAnalysisTabProps) {
  const [posts, setPosts] = useState<PolicyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPolicyPosts() {
      try {
        const response = await fetch(`/api/policy-analysis?examinerKey=${examinerKey}`);

        if (!response.ok) {
          throw new Error('정책분석 글을 불러올 수 없습니다.');
        }

        const data = await response.json();
        setPosts(data.posts || []);
      } catch (err) {
        console.error('정책분석 글 조회 실패:', err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류');
      } finally {
        setLoading(false);
      }
    }

    fetchPolicyPosts();
  }, [examinerKey]);

  // 로딩 중
  if (loading) {
    return (
      <div className="policy-loading">
        <i className="fas fa-spinner fa-spin"></i>
        <p>정책분석 글을 불러오는 중...</p>
      </div>
    );
  }

  // 에러 발생
  if (error) {
    return (
      <div className="policy-error">
        <i className="fas fa-exclamation-triangle"></i>
        <p>{error}</p>
      </div>
    );
  }

  // 작성한 글이 없을 때
  if (posts.length === 0) {
    return (
      <div className="no-policy">
        <i className="fas fa-inbox"></i>
        <p>아직 작성된 정책분석 글이 없습니다.</p>
        <small>나라똔 정책분석 페이지에서 글을 작성하면 여기에 자동으로 표시됩니다.</small>
      </div>
    );
  }

  // 정책분석 글 목록 표시
  return (
    <section className="policy-analysis">
      <div className="container">
        <div className="section-header">
          <h2>정책분석</h2>
          <p>전문가가 직접 작성한 정책분석 글 ({posts.length}개)</p>
        </div>

        <div className="policy-grid">
          {posts.map((post) => (
            <article key={post._id} className="policy-card">
              <Link href={`/policy-analysis/${post._id}`} className="policy-card-link">
                {/* 썸네일 */}
                <div className="policy-thumbnail">
                  {post.thumbnail ? (
                    <Image
                      src={post.thumbnail}
                      alt={post.title}
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="policy-thumbnail-placeholder">
                      <i className="fas fa-file-alt"></i>
                    </div>
                  )}
                </div>

                {/* 콘텐츠 */}
                <div className="policy-content">
                  {/* 메타 정보 */}
                  <div className="policy-meta">
                    <span className="policy-category">{post.category}</span>
                    <span className="policy-date">
                      {new Date(post.createdAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      })}
                    </span>
                  </div>

                  {/* 제목 */}
                  <h3 className="policy-title">{post.title}</h3>

                  {/* 요약 */}
                  <p className="policy-excerpt">{post.excerpt}</p>

                  {/* 조회수 */}
                  <div className="policy-stats">
                    <span className="policy-views">
                      <i className="fas fa-eye"></i> {post.views.toLocaleString()}
                    </span>
                    <span className="policy-likes">
                      <i className="fas fa-heart"></i> {post.likes}
                    </span>
                  </div>

                  {/* 링크 */}
                  <span className="policy-link">
                    자세히 보기 <i className="fas fa-arrow-right"></i>
                  </span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
