'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import './page.css';

interface Question {
  id: string;
  title: string;
  category: string;
  author: {
    nickname: string;
  };
  metrics: {
    viewCount: number;
  };
  answers: any[];
  createdAt: string;
}

export default function QnAListPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchQuestions();
  }, [selectedCategory]);

  const fetchQuestions = async () => {
    try {
      const url = selectedCategory
        ? `/api/business-voice/questions?category=${selectedCategory}&limit=50`
        : `/api/business-voice/questions?limit=50`;

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setQuestions(data.questions);
      }
    } catch (error) {
      console.error('질문 목록 로딩 실패:', error);
    } finally {
      setIsLoading(false);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return '방금 전';
    if (hours < 24) return `${hours}시간 전`;
    if (hours < 168) return `${Math.floor(hours / 24)}일 전`;

    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  };

  return (
    <div className="qna-list-page">
      <div className="container">
        <div className="page-header">
          <div className="header-content">
            <h1>묻고 답하기</h1>
            <p className="page-description">
              사업 운영 중 궁금한 점을 질문하고 다른 사업자와 전문가의 답변을 받아보세요.
            </p>
          </div>
          <Link href="/business-voice/qna/write" className="btn-write">
            질문하기
          </Link>
        </div>

        <div className="filter-bar">
          <button
            className={`filter-btn ${selectedCategory === '' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('')}
          >
            전체
          </button>
          <button
            className={`filter-btn ${selectedCategory === 'tax' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('tax')}
          >
            세무
          </button>
          <button
            className={`filter-btn ${selectedCategory === 'funding' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('funding')}
          >
            자금
          </button>
          <button
            className={`filter-btn ${selectedCategory === 'hr' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('hr')}
          >
            노무
          </button>
          <button
            className={`filter-btn ${selectedCategory === 'legal' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('legal')}
          >
            법무
          </button>
          <button
            className={`filter-btn ${selectedCategory === 'marketing' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('marketing')}
          >
            마케팅
          </button>
        </div>

        {isLoading ? (
          <div className="loading">질문을 불러오는 중...</div>
        ) : questions.length > 0 ? (
          <div className="questions-list">
            {questions.map((question) => (
              <Link
                href={`/business-voice/qna/${question.id}`}
                key={question.id}
                className="question-item"
              >
                <div className="question-main">
                  <span className={`category-badge category-${question.category}`}>
                    {getCategoryLabel(question.category)}
                  </span>
                  <h3 className="question-title">{question.title}</h3>
                  <div className="question-meta">
                    <span className="author">{question.author.nickname}</span>
                    <span className="date">{formatDate(question.createdAt)}</span>
                    <span className="views">조회 {question.metrics.viewCount}</span>
                  </div>
                </div>
                <div className="question-stats">
                  <span className={`answer-count ${question.answers.length > 0 ? 'has-answer' : ''}`}>
                    답변 {question.answers.length}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>아직 등록된 질문이 없습니다.</p>
            <Link href="/business-voice/qna/write" className="btn-write-empty">
              첫 질문 작성하기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
