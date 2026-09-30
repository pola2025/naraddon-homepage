'use client';

import { FormEvent, MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MotionLoader } from '@/components/loading';
import './IndexLanding.css';
import {
  BadgeIcon,
  ChatIcon,
  ClipboardIcon,
  CloseIcon,
  MonitorIcon,
  NewsIcon,
  SearchIcon,
} from './IndexIcons';

/**
 * 나라똔 인덱스(사이트 첫 화면)
 *
 * @purpose 로고 + 검색창 + 카드 4개로 사이트의 첫 진입점을 제공한다
 * @context 2026-09-30 확정한 11차 시안을 그대로 옮겼다. 기존 메인(배경 영상 + 섹션)은 /home 으로 옮겼고,
 *          "나라똔 바로가기" 카드가 /home 으로 연결된다(인트로 로딩영상은 제거)
 * @decision 데스크톱은 780×367 설계 화면을 창 크기에 맞춰 비율 확대한다(시안과 같은 계산식).
 *           첫 그림에서 크기가 튀지 않도록 배율 계산 스크립트를 마크업 바로 뒤에서 한 번 실행한다
 * @note 챗봇은 질문에 답하지 않는다. 어떤 질문이든 고정 안내와 1차 무료 심사 신청 버튼만 보여 준다
 * @note 메뉴 이동이 0.4초를 넘기면 기존 로고 로더(MotionLoader logo)를 전체 화면으로 보여 준다(2026-09-30 A안).
 *       빨리 넘어가면 아무것도 보이지 않고, 새 페이지가 준비되면 이 화면이 사라지며 페이드인으로 이어진다
 */

const DESIGN_WIDTH = 780;
const DESIGN_HEIGHT = 367;
const MAX_SCALE = 1200 / 624;
const MOBILE_MAX_WIDTH = 768;

const CHAT_GREETING = '정책자금 가능 여부, 신용점수, 기대출, 기관 심사 관련 질문을 남겨 주세요.';
const CHAT_REPLY =
  '챗봇 내에서는 자세한 상담이 어렵습니다.\n1차 무료 심사 신청 시 순차적으로 연락드리겠습니다.';
const APPLICATION_HREF = '/consultation-request#form-section';
// 이 시간 안에 이동이 끝나면 로딩 화면을 보여 주지 않는다.
const NAV_LOADING_DELAY = 400;
// 이동이 취소되거나 실패해도 로딩 화면이 남지 않게 하는 안전장치.
const NAV_LOADING_MAX = 15000;

// 시안의 fitDesktopPreview 와 같은 계산. 서버 HTML 에 그대로 넣어 첫 그림 전에 실행한다.
const FIT_SCRIPT = `(function(){var f=document.getElementById('nx-frame');if(!f)return;var w=window.innerWidth,h=window.innerHeight;var s=w<=${MOBILE_MAX_WIDTH}?1:Math.min(Math.max(360,w)/${DESIGN_WIDTH},h/${DESIGN_HEIGHT},${MAX_SCALE});f.parentElement.style.setProperty('--nx-scale',String(s));f.parentElement.style.setProperty('--nx-inverse-scale',String(1/s));})();`;

type ChatMessage = {
  id: number;
  role: 'assistant' | 'user';
  text: string;
  withApplication?: boolean;
};

export default function IndexLanding() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const messageId = useRef(1);
  const [query, setQuery] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, role: 'assistant', text: CHAT_GREETING },
  ]);
  const [navLoading, setNavLoading] = useState(false);
  const navTimer = useRef<number>();

  // 새 탭 열기(Ctrl·Cmd·Shift 클릭, 가운데 버튼)는 이 화면을 떠나지 않으므로 로딩을 걸지 않는다.
  const startNavLoading = useCallback((event?: MouseEvent) => {
    if (
      event &&
      (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    )
      return;
    window.clearTimeout(navTimer.current);
    navTimer.current = window.setTimeout(() => setNavLoading(true), NAV_LOADING_DELAY);
  }, []);

  useEffect(() => () => window.clearTimeout(navTimer.current), []);

  useEffect(() => {
    if (!navLoading) return;
    const timer = window.setTimeout(() => setNavLoading(false), NAV_LOADING_MAX);
    return () => window.clearTimeout(timer);
  }, [navLoading]);

  // 창 크기가 바뀌면 배율을 다시 계산한다(첫 계산은 FIT_SCRIPT 가 담당).
  useEffect(() => {
    const fit = () => {
      const page = pageRef.current;
      if (!page) return;
      const width = window.innerWidth;
      const scale =
        width <= MOBILE_MAX_WIDTH
          ? 1
          : Math.min(
              Math.max(360, width) / DESIGN_WIDTH,
              window.innerHeight / DESIGN_HEIGHT,
              MAX_SCALE
            );
      page.style.setProperty('--nx-scale', String(scale));
      page.style.setProperty('--nx-inverse-scale', String(1 / scale));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  useEffect(() => {
    if (chatOpen) chatInputRef.current?.focus();
  }, [chatOpen]);

  useEffect(() => {
    const box = messagesRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages]);

  // 검색: 기존 메인 히어로 검색과 같은 /search 페이지로 보낸다.
  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    startNavLoading();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  // 챗봇: 질문 내용과 관계없이 고정 안내 + 신청폼 버튼으로 답한다(AI 답변 없음).
  const handleChatSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const text = chatInput.trim();
      if (!text) return;
      setMessages((prev) => [...prev, { id: messageId.current++, role: 'user', text }]);
      setChatInput('');
      window.setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: messageId.current++, role: 'assistant', text: CHAT_REPLY, withApplication: true },
        ]);
      }, 240);
    },
    [chatInput]
  );

  return (
    <div className="nx-index-page" ref={pageRef} suppressHydrationWarning>
      <div className="nx-frame" id="nx-frame">
        <div className="nx-stage">
          <div className="nx-canvas">
            <header className="nx-brand">
              <span className="nx-brand-mark">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/index/naraddon-mark.png" alt="" width={240} height={201} />
              </span>
              <h1 className="nx-brand-name">나라똔</h1>
            </header>

            <form className="nx-search" role="search" onSubmit={handleSearch}>
              <input
                className="nx-search-input"
                name="query"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="사업자를 위한 정책자금 공식 플랫폼"
                aria-label="정책자금 검색"
              />
              <button className="nx-search-submit" type="submit" aria-label="검색">
                <SearchIcon />
              </button>
            </form>

            <section className="nx-cards" aria-label="주요 메뉴">
              <Link className="nx-card nx-primary" href="/home" onClick={startNavLoading}>
                <span className="nx-label">정책자금 공식 플랫폼</span>
                <strong className="nx-title">나라똔 바로가기</strong>
                <MonitorIcon />
              </Link>
              <Link className="nx-card" href="/consultation-request" onClick={startNavLoading}>
                <span className="nx-label">나라똔 100% 사고 책임제</span>
                <strong className="nx-title">무료 심사 신청</strong>
                <ClipboardIcon />
              </Link>
              <Link className="nx-card" href="/certified-examiners" onClick={startNavLoading}>
                <span className="nx-label">나라똔이 보증하는</span>
                <strong className="nx-title">인증심사관 확인</strong>
                <BadgeIcon />
              </Link>
              <Link className="nx-card" href="/policy-news" onClick={startNavLoading}>
                <span className="nx-label">아는 만큼 보이는</span>
                <strong className="nx-title">사업자금 뉴스</strong>
                <NewsIcon />
              </Link>

              <div className="nx-chat-entry">
                <section
                  className="nx-chat-panel"
                  id="nx-chat-panel"
                  role="dialog"
                  aria-label="정책자금 상담 챗봇"
                  hidden={!chatOpen}
                >
                  <div className="nx-chat-panel-header">
                    <h2 className="nx-chat-panel-title">정책자금 상담 안내</h2>
                    <button
                      className="nx-chat-panel-close"
                      type="button"
                      aria-label="챗봇 닫기"
                      onClick={() => setChatOpen(false)}
                    >
                      <CloseIcon />
                    </button>
                  </div>
                  <div className="nx-chat-messages" ref={messagesRef} aria-live="polite">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`nx-chat-message nx-chat-message-${message.role}`}
                      >
                        <p>{message.text}</p>
                        {message.withApplication && (
                          <Link
                            className="nx-chat-cta"
                            href={APPLICATION_HREF}
                            onClick={startNavLoading}
                          >
                            1차 무료 심사 신청하기
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                  <form className="nx-chat-form" onSubmit={handleChatSubmit}>
                    <input
                      ref={chatInputRef}
                      className="nx-chat-input"
                      name="message"
                      type="text"
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      placeholder="예: 신용점수 700점인데 가능한가요?"
                      aria-label="상담 질문"
                      autoComplete="off"
                    />
                    <button className="nx-chat-send" type="submit">
                      보내기
                    </button>
                  </form>
                </section>
                <button
                  className="nx-chat-button"
                  type="button"
                  aria-label="챗봇 문의"
                  aria-controls="nx-chat-panel"
                  aria-expanded={chatOpen}
                  onClick={() => setChatOpen((open) => !open)}
                >
                  <ChatIcon />
                </button>
              </div>
            </section>
          </div>

          <footer className="nx-footer" aria-label="나라똔 사이트 푸터">
            <div className="nx-footer-container">
              <div className="nx-footer-details">
                <p className="nx-footer-company">Company. 나라똔 | Owner. 이서영</p>
                <p className="nx-footer-company">
                  Address. 14353 경기도 광명시 일직로 43, B동 14층 | E-mail. jjk-biz@naver.com
                </p>
                <p className="nx-footer-company">Tel. 02-6914-5567 Mon-Fri. am10시 – pm5시</p>
                <p className="nx-copyright">Copyright © NARADDON. All Rights Reserved.</p>
              </div>
              <p className="nx-footer-partnership">
                파트너십 제휴 문의: <a href="mailto:jjk-biz@naver.com">jjk-biz@naver.com</a>
              </p>
            </div>
          </footer>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: FIT_SCRIPT }} />
      {navLoading && (
        <div className="nx-nav-loading" role="status" aria-live="polite">
          <MotionLoader variant="logo" message="페이지 준비 중" />
        </div>
      )}
    </div>
  );
}
