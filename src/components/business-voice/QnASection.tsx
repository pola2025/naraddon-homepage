'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './qna-section.css';

interface QnAItem {
  _id: string;
  question: string;
  questionAuthor: string;
  questionTime: string;
  category: string;
  views: number;
  answers: Answer[];
  isHot?: boolean;
  isSolved?: boolean;
}

interface Answer {
  _id: string;
  content: string;
  author: string;
  authorRole?: 'general' | 'expert' | 'certified_examiner';
  authorInfo?: {
    name: string;
    company?: string;
  };
  time: string;
  isAccepted?: boolean;
  helpfulCount: number;
}

// API 응답 타입
interface ApiQuestion {
  id: string;
  title: string;
  createdAt: string;
  category: string;
  author: {
    nickname: string;
  };
  metrics: {
    viewCount: number;
  };
  answers: ApiAnswer[];
}

interface ApiAnswer {
  profileId?: string;
  content: string;
  displayName: string;
  role: string;
  organization?: string;
  answeredAt?: string;
  isPinned: boolean;
  helpfulCount?: number;
}

interface ApiResponse {
  questions: ApiQuestion[];
  count: number;
}

// 시간 포맷팅 헬퍼 함수
const formatTimeAgo = (dateString: string): string => {
  if (!dateString) return '방금 전';

  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return '방금 전';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}주 전`;
  return `${Math.floor(diffInSeconds / 2592000)}개월 전`;
};

// API role을 컴포넌트 role로 매핑
const mapAuthorRole = (
  apiRole: string
): 'general' | 'expert' | 'certified_examiner' | undefined => {
  switch (apiRole) {
    case 'examiner':
      return 'certified_examiner';
    case 'expert':
      return 'expert';
    case 'consultant':
      return 'expert';
    case 'community':
      return 'general';
    default:
      return 'general';
  }
};

export default function QnASection() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [qnaItems, setQnaItems] = useState<QnAItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchQnAData();
  }, []);

  const fetchQnAData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/business-voice/questions?limit=10', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      // API 응답 데이터를 컴포넌트 인터페이스에 맞게 변환
      const transformedData: QnAItem[] = data.questions.map((q: ApiQuestion) => ({
        _id: q.id,
        question: q.title,
        questionAuthor: q.author.nickname,
        questionTime: formatTimeAgo(q.createdAt),
        category: q.category,
        views: q.metrics.viewCount,
        isHot: q.metrics.viewCount > 300,
        isSolved: q.answers.some((a: ApiAnswer) => a.isPinned),
        answers: q.answers.map((a: ApiAnswer): Answer => ({
          _id: a.profileId || Math.random().toString(),
          content: a.content,
          author: a.displayName,
          authorRole: mapAuthorRole(a.role),
          authorInfo: {
            name: a.displayName,
            company: a.organization,
          },
          time: formatTimeAgo(a.answeredAt || ''),
          isAccepted: a.isPinned,
          helpfulCount: a.helpfulCount || 0,
        })),
      }));

      setQnaItems(transformedData);
    } catch (error) {
      console.error('Q&A 데이터 로딩 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'certified_examiner':
        return <span className="role-badge badge-examiner">기업심사관</span>;
      case 'expert':
        return <span className="role-badge badge-expert">전문가</span>;
      default:
        return null;
    }
  };

  const handleAskClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    // 로그인 상태 확인
    if (!session) {
      alert('로그인 후 질문할 수 있습니다.');
      router.push('/auth/login?callbackUrl=/business-voice/qna/write');
      return;
    }

    // 기업심사관 제한 (댓글만 작성 가능, 게시글 작성 불가)
    if (session.user?.role === 'examiner') {
      alert('이 게시판은 사업자가 질문을 하는 게시판입니다.\n기업심사관은 댓글로 작성 바랍니다.');
      return;
    }

    // 로그인한 경우 작성 페이지로 이동
    router.push('/business-voice/qna/write');
  };

  return (
    <section id="qna-section" className="qna-section">
      <div className="qna-container">
        <div className="section-header">
          <h2>묻고 답하기</h2>
          <p>사업하면서 궁금한 것들에 대한<br />
질문과 답변을 나누는 공간입니다</p>
        </div>

        {isLoading ? (
          <div className="qna-loading">
            <div className="qna-skeleton-item" />
            <div className="qna-skeleton-item" />
            <div className="qna-skeleton-item" />
          </div>
        ) : (
          <div className="qna-main-wrapper">
            {/* 왼쪽: 카드 형식 Q&A */}
            <div className="qna-cards">
              {qnaItems.slice(0, 3).map((item) => (
              <div key={item._id} className="qna-item">
                <div className="qna-question-area">
                  <div className="qna-header">
                    <div className="qna-meta">
                      {item.isHot && <span className="hot-badge">🔥 HOT</span>}
                      {item.isSolved && <span className="solved-badge">✓ 해결됨</span>}
                      <span className={`qna-category category-${item.category}`}>
                        {item.category === 'tax' ? '세무' :
                         item.category === 'funding' ? '자금' :
                         item.category === 'legal' ? '법무' :
                         item.category === 'hr' ? '노무' : '마케팅'}
                      </span>
                      <span className="qna-author">{item.questionAuthor}</span>
                      <span className="qna-time">{item.questionTime}</span>
                      <span className="qna-views">조회 {item.views}</span>
                    </div>
                  </div>

                  <Link href={`/business-voice/qna/${item._id}`} className="qna-title-link">
                    <h3 className="qna-title">
                      <span className="q-mark">Q</span>
                      {item.question}
                    </h3>
                  </Link>

                  <div className="qna-actions">
                    <button
                      className="btn-toggle-answers"
                      onClick={() => toggleExpanded(item._id)}
                    >
                      {expandedItems.has(item._id) ? (
                        <>답변 닫기 <i className="fas fa-chevron-up" /></>
                      ) : (
                        <>답변 {item.answers.length}개 보기 <i className="fas fa-chevron-down" /></>
                      )}
                    </button>
                    {!item.isSolved && (
                      <button className="btn-write-answer">
                        답변하기
                      </button>
                    )}
                  </div>
                </div>

                {expandedItems.has(item._id) && (
                  <div className="qna-answers-area">
                    {item.answers.map((answer) => (
                      <div
                        key={answer._id}
                        className={`qna-answer ${answer.isAccepted ? 'accepted-answer' : ''} ${answer.authorRole ? `role-${answer.authorRole}` : ''}`}
                      >
                        <div className="answer-header">
                          <span className="a-mark">A</span>
                          <div className="answer-author-info">
                            <span className="answer-author">{answer.author}</span>
                            {getRoleBadge(answer.authorRole)}
                            {answer.authorInfo?.company && (
                              <span className="author-company">{answer.authorInfo.company}</span>
                            )}
                          </div>
                          {answer.isAccepted && (
                            <span className="accepted-badge">✓ 채택됨</span>
                          )}
                          <span className="answer-time">{answer.time}</span>
                        </div>

                        <div className="answer-content">
                          {answer.content}
                        </div>

                        <div className="answer-footer">
                          <button className="helpful-btn">
                            <i className="far fa-thumbs-up" /> 도움됨 {answer.helpfulCount}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            </div>

            {/* 오른쪽: 테이블 형식 Q&A */}
            <div className="qna-table-section">
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '12px', color: '#1f2937' }}>
                전체 Q&A
              </h3>
              <div className="qna-table-wrapper">
                <table className="qna-table">
                  <thead>
                    <tr>
                      <th width="60">분류</th>
                      <th>질문</th>
                      <th width="80">작성자</th>
                      <th width="60">조회</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qnaItems.slice(0, 10).map((item) => (
                      <tr key={item._id}>
                        <td className="category-cell">
                          <span className={`category-badge category-${item.category}`}>
                            {item.category === 'tax' ? '세무' :
                             item.category === 'funding' ? '자금' :
                             item.category === 'legal' ? '법무' : '노무'}
                          </span>
                        </td>
                        <td className="title-cell">
                          <Link href={`/business-voice/qna/${item._id}`} className="question-link">
                            {item.question}
                            {item.answers.length > 0 && (
                              <span style={{ color: '#2563eb', fontWeight: 600, marginLeft: '4px' }}>
                                ({item.answers.length})
                              </span>
                            )}
                            {item.isSolved && ' ✓'}
                          </Link>
                        </td>
                        <td style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {item.questionAuthor.substring(0, 6)}
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '0.7rem', color: '#94a3b8' }}>
                          {item.questionTime.split(' ')[0]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 추가 */}
              <div className="qna-pagination">
                <button className="qna-page-btn active">1</button>
                <button className="qna-page-btn">2</button>
                <button className="qna-page-btn">3</button>
                <button className="qna-page-btn">4</button>
                <button className="qna-page-btn">5</button>
                <button className="qna-page-btn">다음 ›</button>
              </div>
            </div>
          </div>
        )}

        <div className="qna-actions">
          <a href="#" onClick={handleAskClick} className="ask-btn">
            <i className="fas fa-edit" /> 질문하기
          </a>
          <Link href="/business-voice/qna" className="more-qa-btn">
            더 많은 Q&A 보기
          </Link>
        </div>
      </div>
    </section>
  );
}