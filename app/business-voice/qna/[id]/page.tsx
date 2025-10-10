'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import './page.css';

interface Question {
  id: string;
  title: string;
  content: string;
  category: string;
  author: {
    nickname: string;
    businessType: string;
    region: string;
    yearsInBusiness?: number | null;
  };
  metrics: {
    viewCount: number;
    commentCount: number;
    scrapCount: number;
  };
  flags: {
    needsExpertReply: boolean;
    needsExaminerReply: boolean;
  };
  answers: Answer[];
  createdAt: string;
  updatedAt: string;
}

interface Answer {
  role: string;
  displayName: string;
  organization?: string;
  content: string;
  isPinned: boolean;
  helpfulCount: number;
  answeredAt?: string;
}

export default function QnADetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answerContent, setAnswerContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const questionId = params.id as string;

  useEffect(() => {
    fetchQuestion();
  }, [questionId]);

  const fetchQuestion = async () => {
    try {
      const response = await fetch(`/api/business-voice/questions/${questionId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '질문을 불러오는데 실패했습니다.');
      }

      setQuestion(data.question);
    } catch (error) {
      alert(error instanceof Error ? error.message : '질문을 불러오는데 실패했습니다.');
      router.push('/business-voice/qna');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      alert('로그인이 필요합니다.');
      router.push('/auth/login');
      return;
    }

    if (!answerContent.trim()) {
      alert('답변 내용을 입력해주세요.');
      return;
    }

    if (answerContent.length < 10) {
      alert('답변은 최소 10자 이상 작성해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/business-voice/questions/${questionId}/answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: answerContent }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '답변 등록에 실패했습니다.');
      }

      alert('답변이 등록되었습니다.');
      setAnswerContent('');
      fetchQuestion(); // 새로고침
    } catch (error) {
      alert(error instanceof Error ? error.message : '답변 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const categories: Record<string, string> = {
      tax: '세무',
      funding: '자금',
      hr: '노무',
      legal: '법무',
      marketing: '마케팅',
    };
    return categories[category] || category;
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'examiner':
        return <span className="role-badge examiner">기업심사관</span>;
      case 'expert':
        return <span className="role-badge expert">전문가</span>;
      case 'consultant':
        return <span className="role-badge consultant">컨설턴트</span>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * 로그인 권한 체크
   *
   * @purpose 가입자만 묻고 답하기 게시글 열람 가능
   * @context 로그인하지 않은 사용자는 로그인 페이지로 리다이렉트
   */
  if (status === 'loading' || isLoading) {
    return (
      <div className="qna-detail-page">
        <div className="container">
          <div className="loading">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!session || !session.user) {
    return (
      <div className="qna-detail-page">
        <div className="auth-required-container">
          <div className="auth-card">
            <div className="auth-icon-wrapper">
              <i className="fas fa-hand-wave"></i>
            </div>
            <h2 className="auth-title">안녕하세요 대표님!</h2>
            <p className="auth-message">
              기업에 꼭 필요한 자금문제를<br />
              지금 나라똔에서 해결하세요.
            </p>
            <div className="auth-divider"></div>
            <p className="auth-description">
              본 서비스는 나라똔 회원만 이용할 수 있습니다.<br />
              가입 후 이용하시면 바로 확인 가능합니다.
            </p>
            <div className="auth-buttons">
              <button
                className="auth-button primary"
                onClick={() => router.push('/auth/login?callbackUrl=' + encodeURIComponent(window.location.pathname))}
              >
                <i className="fas fa-user-plus"></i>
                <span>회원가입 / 로그인</span>
              </button>
              <button
                className="auth-button secondary"
                onClick={() => router.push('/business-voice/qna')}
              >
                <i className="fas fa-arrow-left"></i>
                <span>목록으로 돌아가기</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!question) {
    return null;
  }

  return (
    <div className="qna-detail-page">
      <div className="container">
        <div className="breadcrumb">
          <Link href="/business-voice">사업자 목소리</Link>
          <span className="separator">›</span>
          <Link href="/business-voice/qna">묻고 답하기</Link>
          <span className="separator">›</span>
          <span className="current">질문 상세</span>
        </div>

        <div className="question-card">
          <div className="question-header">
            <span className={`category-badge category-${question.category}`}>
              {getCategoryLabel(question.category)}
            </span>
            {question.flags.needsExpertReply && (
              <span className="expert-requested-badge">전문가 답변 요청</span>
            )}
          </div>

          <h1 className="question-title">{question.title}</h1>

          <div className="question-meta">
            <span className="author">{question.author.nickname}</span>
            {question.author.businessType && (
              <span className="business-info">{question.author.businessType}</span>
            )}
            {question.author.region && <span className="region">{question.author.region}</span>}
            <span className="date">{formatDate(question.createdAt)}</span>
            <span className="views">조회 {question.metrics.viewCount}</span>
          </div>

          <div className="question-content">
            <p>{question.content}</p>
          </div>
        </div>

        <div className="answers-section">
          <h2 className="section-title">
            답변 <span className="count">{question.answers.length}</span>
          </h2>

          {question.answers.length > 0 ? (
            <div className="answers-list">
              {question.answers.map((answer, index) => (
                <div
                  key={index}
                  className={`answer-card ${answer.isPinned ? 'pinned' : ''} role-${answer.role}`}
                >
                  {answer.isPinned && <div className="pinned-badge">✓ 채택된 답변</div>}

                  <div className="answer-header">
                    <div className="answer-author">
                      <span className="name">{answer.displayName}</span>
                      {getRoleBadge(answer.role)}
                      {answer.organization && (
                        <span className="organization">{answer.organization}</span>
                      )}
                    </div>
                    <span className="answer-date">
                      {answer.answeredAt && formatDate(answer.answeredAt)}
                    </span>
                  </div>

                  <div className="answer-content">
                    <p>{answer.content}</p>
                  </div>

                  <div className="answer-footer">
                    <button className="helpful-btn">
                      <i className="far fa-thumbs-up" /> 도움됨 {answer.helpfulCount}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-answers">
              <p>아직 답변이 없습니다. 첫 번째 답변을 작성해보세요!</p>
            </div>
          )}
        </div>

        <div className="answer-write-section">
          <h2 className="section-title">답변 작성</h2>

          {session ? (
            <form onSubmit={handleAnswerSubmit} className="answer-form">
              <textarea
                value={answerContent}
                onChange={(e) => setAnswerContent(e.target.value)}
                placeholder="답변 내용을 작성해주세요 (최소 10자)"
                rows={8}
                disabled={isSubmitting}
              />
              <div className="form-footer">
                <span className="char-count">{answerContent.length}/3000</span>
                <button type="submit" className="btn-submit" disabled={isSubmitting}>
                  {isSubmitting ? '등록 중...' : '답변 등록'}
                </button>
              </div>
            </form>
          ) : (
            <div className="login-required">
              <p>답변을 작성하려면 로그인이 필요합니다.</p>
              <Link href="/auth/login" className="btn-login">
                로그인하기
              </Link>
            </div>
          )}
        </div>

        <div className="page-actions">
          <Link href="/business-voice/qna" className="btn-list">
            목록으로
          </Link>
        </div>
      </div>
    </div>
  );
}
