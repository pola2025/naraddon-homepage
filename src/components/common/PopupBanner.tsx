'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import './PopupBanner.css';

interface PopupItem {
  /** 팝업 이미지 경로 */
  imageSrc: string;
  /** 클릭 시 이동할 링크 */
  href: string;
  /** 이미지 alt 텍스트 */
  alt?: string;
}

interface PopupBannerProps {
  /** 팝업 이미지 배열 (여러 개 나란히 표시) */
  items: PopupItem[];
  /** 팝업 식별자 (localStorage 키로 사용) */
  popupId: string;
}

/**
 * 팝업 배너 컴포넌트
 *
 * @purpose 프로모션/이벤트 팝업 배너 표시 (다중 이미지 지원)
 * @features
 *   - 여러 팝업 이미지 나란히 표시
 *   - "오늘 하루 보지 않기" 기능 (localStorage 사용)
 *   - 클릭 시 지정된 페이지로 이동
 *   - 닫기 버튼
 *   - 반응형 디자인 (모바일: 세로 스크롤, 데스크톱: 가로 나란히)
 */
export default function PopupBanner({
  items,
  popupId,
}: PopupBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // localStorage에서 "오늘 하루 보지 않기" 체크
    const hideUntil = localStorage.getItem(`popup_hide_${popupId}`);

    if (hideUntil) {
      const hideDate = new Date(hideUntil);
      const now = new Date();

      // 저장된 날짜가 아직 유효하면 팝업 숨김
      if (now < hideDate) {
        return;
      }
    }

    // 팝업 표시
    setIsVisible(true);
  }, [popupId]);

  // 팝업 닫기
  const handleClose = () => {
    setIsVisible(false);
  };

  // "오늘 하루 보지 않기" 클릭
  const handleHideToday = () => {
    // 오늘 자정까지 숨김
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    localStorage.setItem(`popup_hide_${popupId}`, tomorrow.toISOString());
    setIsVisible(false);
  };

  if (!isVisible || items.length === 0) return null;

  // 단일 vs 다중 클래스 구분
  const isMultiple = items.length > 1;

  return (
    <div className="popup-banner-overlay" onClick={handleClose}>
      <div className="popup-banner-card" onClick={(e) => e.stopPropagation()}>
        {/* 이미지 영역 */}
        <div className={`popup-banner-images ${isMultiple ? 'popup-banner-images--multiple' : ''}`}>
          {items.map((item, index) => (
            <Link key={index} href={item.href} className="popup-banner-link" onClick={handleClose}>
              <img
                src={item.imageSrc}
                alt={item.alt || '프로모션 배너'}
                className="popup-banner-image"
              />
            </Link>
          ))}
        </div>
        {/* 버튼 영역 (공통) */}
        <div className="popup-banner-footer">
          <button className="popup-banner-hide-today" onClick={handleHideToday}>
            오늘 하루 보지 않기
          </button>
          <button className="popup-banner-close-btn" onClick={handleClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
