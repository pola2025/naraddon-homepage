'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Expert {
  _id: string;
  name: string;
  position: string;
  companyName: string;
  imageUrl: string;
  imageAlt?: string;
  legacyKey?: string;
}

export function ExpertShowcase() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/experts', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.experts)) {
          setExperts(data.experts);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load experts:', err);
        setIsLoading(false);
      });
  }, []);

  const nextExpert = () => {
    setCurrentIndex((prev) => (prev + 1) % experts.length);
  };

  const prevExpert = () => {
    setCurrentIndex((prev) => (prev - 1 + experts.length) % experts.length);
  };

  if (isLoading) {
    return (
      <div className="expert-showcase-loading">
        <p className="text-center text-slate-600">전문가 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (experts.length === 0) {
    return (
      <div className="expert-showcase-empty">
        <p className="text-center text-slate-600">등록된 전문가가 없습니다.</p>
      </div>
    );
  }

  const currentExpert = experts[currentIndex];

  return (
    <div className="expert-showcase">
      <div className="expert-showcase__header">
        <p className="expert-showcase__eyebrow">Expert Network</p>
        <h2 className="expert-showcase__title">검증된 전문가 네트워크</h2>
        <p className="expert-showcase__description">
          분야별 인증 전문가가 실제 상담 경험을 바탕으로 맞춤형 실행 전략을 제안합니다.
        </p>
      </div>

      <div className="expert-showcase__carousel">
        <div className="expert-card">
          <div className="expert-card__image">
            <img
              src={currentExpert.imageUrl}
              alt={currentExpert.imageAlt || `${currentExpert.name} 전문가`}
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                const fallback = target.nextElementSibling;
                if (fallback) {
                  fallback.classList.remove('hidden');
                }
              }}
            />
            <div className="expert-card__image-fallback hidden">
              <i className="fas fa-user-tie" />
            </div>
          </div>

          <div className="expert-card__content">
            <span className="expert-badge">인증 전문가</span>
            <h3 className="expert-name">{currentExpert.name}</h3>
            <p className="expert-position">{currentExpert.position}</p>
            <p className="expert-company">{currentExpert.companyName}</p>
          </div>

          <a href="#expert-consultation-form" className="expert-card__cta">
            상담 요청하기
            <i className="fas fa-arrow-right" />
          </a>
        </div>

        {experts.length > 1 && (
          <div className="expert-showcase__controls">
            <button
              type="button"
              onClick={prevExpert}
              className="carousel-btn carousel-btn--prev"
              aria-label="이전 전문가"
            >
              <i className="fas fa-chevron-left" />
            </button>
            <button
              type="button"
              onClick={nextExpert}
              className="carousel-btn carousel-btn--next"
              aria-label="다음 전문가"
            >
              <i className="fas fa-chevron-right" />
            </button>
          </div>
        )}

        <div className="expert-showcase__indicators">
          {experts.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={`indicator ${index === currentIndex ? 'active' : ''}`}
              aria-label={`${index + 1}번째 전문가`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
