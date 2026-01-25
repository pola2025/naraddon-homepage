/**
 * 페이지 로딩 컴포넌트
 *
 * @purpose 페이지별로 다른 로딩 애니메이션을 쉽게 적용할 수 있는 재사용 컴포넌트
 * @usage 각 페이지의 loading.tsx에서 import하여 사용
 *
 * @example
 * // app/policy-news/loading.tsx
 * import PageLoader from '@/components/common/PageLoader';
 * export default function Loading() {
 *   return <PageLoader variant="ripple" message="정책소식 준비중" />;
 * }
 */

import React from 'react';

type LoaderVariant =
  | 'spinner'      // 1. 클래식 스피너
  | 'dual-ring'    // 2. 듀얼 링
  | 'pulse-dots'   // 3. 펄스 도트
  | 'ripple'       // 4. 리플 이펙트
  | 'gradient'     // 5. 그라데이션 로테이션
  | 'wave-bars'    // 6. 웨이브 바
  | 'bounce-dots'  // 7. 바운스 도트
  | 'glow-pulse'   // 12. 글로우 펄스
  | 'loading-bar'  // 17. 로딩 바
  | 'logo-pulse';  // 20. 로고 펄스

interface PageLoaderProps {
  /** 로딩 애니메이션 스타일 */
  variant?: LoaderVariant;
  /** 메인 메시지 */
  message?: string;
  /** 서브 메시지 */
  subMessage?: string;
  /** 로고 표시 여부 */
  showLogo?: boolean;
  /** 배경 스타일 */
  background?: 'default' | 'white' | 'gradient';
}

export default function PageLoader({
  variant = 'spinner',
  message = '로딩중',
  subMessage = '잠시만 기다려주세요',
  showLogo = true,
  background = 'gradient',
}: PageLoaderProps) {
  const bgClass = {
    default: 'bg-gray-50',
    white: 'bg-white',
    gradient: 'bg-gradient-to-br from-slate-50 to-gray-100',
  }[background];

  return (
    <div className={`page-loader ${bgClass}`}>
      {/* 로고 */}
      {showLogo && (
        <div className="loader-logo">
          <img src="/logo-naraddon.png" alt="나라똔" />
        </div>
      )}

      {/* 로딩 애니메이션 */}
      <div className="loader-animation">
        {variant === 'spinner' && <SpinnerLoader />}
        {variant === 'dual-ring' && <DualRingLoader />}
        {variant === 'pulse-dots' && <PulseDotsLoader />}
        {variant === 'ripple' && <RippleLoader />}
        {variant === 'gradient' && <GradientLoader />}
        {variant === 'wave-bars' && <WaveBarsLoader />}
        {variant === 'bounce-dots' && <BounceDotsLoader />}
        {variant === 'glow-pulse' && <GlowPulseLoader />}
        {variant === 'loading-bar' && <LoadingBarLoader />}
        {variant === 'logo-pulse' && <LogoPulseLoader />}
      </div>

      {/* 텍스트 */}
      <p className="loader-message">{message}</p>
      <p className="loader-sub-message">{subMessage}</p>

      <style jsx>{`
        .page-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          padding: 40px 20px;
        }

        .loader-logo {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          box-shadow: 0 8px 32px rgba(5, 150, 105, 0.25);
        }

        .loader-logo img {
          width: 40px;
          height: 40px;
          object-fit: contain;
          filter: brightness(0) invert(1);
        }

        .loader-animation {
          margin-bottom: 24px;
        }

        .loader-message {
          color: #059669;
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 8px 0;
          letter-spacing: -0.5px;
        }

        .loader-sub-message {
          color: #6b7280;
          font-size: 14px;
          margin: 0;
        }
      `}</style>
    </div>
  );
}

// 1. 클래식 스피너
function SpinnerLoader() {
  return (
    <>
      <div className="spinner" />
      <style jsx>{`
        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e5e7eb;
          border-top-color: #059669;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

// 2. 듀얼 링
function DualRingLoader() {
  return (
    <>
      <div className="dual-ring" />
      <style jsx>{`
        .dual-ring {
          position: relative;
          width: 56px;
          height: 56px;
        }
        .dual-ring::before,
        .dual-ring::after {
          content: '';
          position: absolute;
          border-radius: 50%;
          border: 3px solid transparent;
        }
        .dual-ring::before {
          width: 100%;
          height: 100%;
          border-top-color: #059669;
          border-bottom-color: #059669;
          animation: spin 1s linear infinite;
        }
        .dual-ring::after {
          width: 70%;
          height: 70%;
          top: 15%;
          left: 15%;
          border-left-color: #10b981;
          border-right-color: #10b981;
          animation: spin 0.8s linear infinite reverse;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

// 3. 펄스 도트
function PulseDotsLoader() {
  return (
    <>
      <div className="pulse-dots">
        <span /><span /><span />
      </div>
      <style jsx>{`
        .pulse-dots {
          display: flex;
          gap: 8px;
        }
        .pulse-dots span {
          width: 12px;
          height: 12px;
          background: #059669;
          border-radius: 50%;
          animation: pulse-dot 1.4s ease-in-out infinite;
        }
        .pulse-dots span:nth-child(2) { animation-delay: 0.2s; }
        .pulse-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes pulse-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}

// 4. 리플 이펙트
function RippleLoader() {
  return (
    <>
      <div className="ripple">
        <span /><span />
      </div>
      <style jsx>{`
        .ripple {
          position: relative;
          width: 80px;
          height: 80px;
        }
        .ripple span {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 3px solid #059669;
          border-radius: 50%;
          animation: ripple-effect 1.5s ease-out infinite;
        }
        .ripple span:nth-child(2) { animation-delay: 0.5s; }
        @keyframes ripple-effect {
          0% { transform: scale(0.3); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </>
  );
}

// 5. 그라데이션 로테이션
function GradientLoader() {
  return (
    <>
      <div className="gradient-spinner" />
      <style jsx>{`
        .gradient-spinner {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: conic-gradient(from 0deg, transparent 0%, #059669 100%);
          animation: spin 1s linear infinite;
          -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 5px), black calc(100% - 5px));
          mask: radial-gradient(farthest-side, transparent calc(100% - 5px), black calc(100% - 5px));
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

// 6. 웨이브 바
function WaveBarsLoader() {
  return (
    <>
      <div className="wave-bars">
        <span /><span /><span /><span /><span />
      </div>
      <style jsx>{`
        .wave-bars {
          display: flex;
          gap: 4px;
          align-items: center;
          height: 40px;
        }
        .wave-bars span {
          width: 6px;
          height: 20px;
          background: #059669;
          border-radius: 3px;
          animation: wave 1s ease-in-out infinite;
        }
        .wave-bars span:nth-child(2) { animation-delay: 0.1s; }
        .wave-bars span:nth-child(3) { animation-delay: 0.2s; }
        .wave-bars span:nth-child(4) { animation-delay: 0.3s; }
        .wave-bars span:nth-child(5) { animation-delay: 0.4s; }
        @keyframes wave {
          0%, 100% { height: 20px; }
          50% { height: 40px; }
        }
      `}</style>
    </>
  );
}

// 7. 바운스 도트
function BounceDotsLoader() {
  return (
    <>
      <div className="bounce-dots">
        <span /><span /><span />
      </div>
      <style jsx>{`
        .bounce-dots {
          display: flex;
          gap: 6px;
        }
        .bounce-dots span {
          width: 14px;
          height: 14px;
          background: #059669;
          border-radius: 50%;
          animation: bounce 0.6s ease-in-out infinite alternate;
        }
        .bounce-dots span:nth-child(2) { animation-delay: 0.2s; }
        .bounce-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-20px); }
        }
      `}</style>
    </>
  );
}

// 12. 글로우 펄스
function GlowPulseLoader() {
  return (
    <>
      <div className="glow-pulse" />
      <style jsx>{`
        .glow-pulse {
          width: 48px;
          height: 48px;
          background: #059669;
          border-radius: 50%;
          animation: glow 1.5s ease-in-out infinite;
        }
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(5, 150, 105, 0.4);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 20px 10px rgba(5, 150, 105, 0.2);
            transform: scale(1.05);
          }
        }
      `}</style>
    </>
  );
}

// 17. 로딩 바
function LoadingBarLoader() {
  return (
    <>
      <div className="loading-bar" />
      <style jsx>{`
        .loading-bar {
          width: 120px;
          height: 6px;
          background: #e5e7eb;
          border-radius: 3px;
          overflow: hidden;
        }
        .loading-bar::after {
          content: '';
          display: block;
          width: 40%;
          height: 100%;
          background: linear-gradient(90deg, #059669, #10b981);
          border-radius: 3px;
          animation: loading-bar 1.5s ease-in-out infinite;
        }
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </>
  );
}

// 20. 로고 펄스
function LogoPulseLoader() {
  return (
    <>
      <div className="logo-pulse-container">
        <div className="logo-box">
          <img src="/logo-naraddon.png" alt="나라똔" />
        </div>
        <div className="logo-ring" />
      </div>
      <style jsx>{`
        .logo-pulse-container {
          position: relative;
        }
        .logo-box {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: logo-pulse 2s ease-in-out infinite;
          box-shadow: 0 8px 32px rgba(5, 150, 105, 0.3);
        }
        .logo-box img {
          width: 40px;
          height: 40px;
          object-fit: contain;
          filter: brightness(0) invert(1);
        }
        .logo-ring {
          position: absolute;
          top: -8px;
          left: -8px;
          right: -8px;
          bottom: -8px;
          border: 3px solid #059669;
          border-radius: 20px;
          animation: logo-ring 1.5s linear infinite;
          opacity: 0.5;
        }
        @keyframes logo-pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 8px 32px rgba(5, 150, 105, 0.3);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 12px 48px rgba(5, 150, 105, 0.4);
          }
        }
        @keyframes logo-ring {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.3); opacity: 0; }
        }
      `}</style>
    </>
  );
}
