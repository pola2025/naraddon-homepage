'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Cloudflare Turnstile 위젯 컴포넌트
 *
 * @purpose 봇 자동접수 방지 - 사용자에게 거의 보이지 않는 CAPTCHA
 * @context 상담 접수 폼에 삽입하여 자동화 공격 차단
 */

interface TurnstileProps {
  onToken: (token: string) => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

export default function Turnstile({ onToken }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: onToken,
      theme: 'light',
      size: 'compact',
    });
  }, [onToken]);

  useEffect(() => {
    if (!SITE_KEY) return;

    // Turnstile 스크립트 로드
    if (window.turnstile) {
      renderWidget();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
    script.async = true;

    (window as unknown as Record<string, unknown>).onTurnstileLoad = renderWidget;
    document.head.appendChild(script);

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  if (!SITE_KEY) return null;

  return <div ref={containerRef} style={{ marginTop: '8px' }} />;
}
