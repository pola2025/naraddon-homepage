'use client';

/**
 * 모션그래픽 로더 컴포넌트
 *
 * @purpose 동그라미 스피너를 대체하는 상황별 모션그래픽 로딩 애니메이션
 * @context 각 variant는 콘텐츠 맥락에 맞는 시각적 메타포를 제공
 *
 * @variant scan — 문서 스캔 (정책소식/정책분석 상세)
 * @variant logo — 로고 브리딩 (인증 체크, 풀페이지)
 * @variant pulse — 펄스 라인 (데이터 분석)
 * @variant ring — 프로그레스 링 (범용)
 * @variant typing — 타이핑 버블 (뚠뚠톡, Q&A)
 * @variant wave — 플로우 웨이브 (영상, 인터뷰)
 * @variant orbit — 오르빗 (프로필, 데이터 수집)
 * @variant blocks — 블록 빌드 (대시보드, 테이블)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { BRAND } from './constants';

type MotionLoaderVariant =
  | 'scan'
  | 'logo'
  | 'pulse'
  | 'ring'
  | 'typing'
  | 'wave'
  | 'orbit'
  | 'blocks';

interface MotionLoaderProps {
  variant?: MotionLoaderVariant;
  message?: string;
  /** 전체 화면 오버레이 */
  fullScreen?: boolean;
  /** 컴포넌트 크기 */
  size?: 'sm' | 'md' | 'lg';
}

const sizeScale = { sm: 0.75, md: 1, lg: 1.25 };

// ─── A. 문서 스캔 ───
function ScanLoader({ scale }: { scale: number }) {
  const w = Math.round(44 * scale);
  const h = Math.round(56 * scale);
  return (
    <div
      style={{
        position: 'relative',
        width: w,
        height: h,
        background: 'white',
        borderRadius: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1.5px solid #e5e7eb',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: `${8 * scale}px ${6 * scale}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: 4 * scale,
        }}
      >
        {[80, 65, 75, 50, 70].map((w, i) => (
          <div
            key={i}
            style={{ height: 3 * scale, width: `${w}%`, background: '#e5e7eb', borderRadius: 2 }}
          />
        ))}
      </div>
      <motion.div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${BRAND.green}, transparent)`,
          boxShadow: `0 0 8px ${BRAND.greenGlow}`,
        }}
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

// ─── B. 로고 브리딩 ───
function LogoLoader({ scale }: { scale: number }) {
  const s = Math.round(48 * scale);
  const colors = [BRAND.green, BRAND.greenLight, BRAND.greenLight, '#34d399'];
  return (
    <div
      style={{
        width: s,
        height: s,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 3 * scale,
      }}
    >
      {colors.map((color, i) => (
        <motion.div
          key={i}
          style={{ background: color, borderRadius: 4 }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1, 0.9] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

// ─── C. 펄스 라인 ───
function PulseLoader({ scale }: { scale: number }) {
  const w = Math.round(64 * scale);
  const h = Math.round(32 * scale);
  return (
    <svg width={w} height={h} viewBox="0 0 64 32">
      <motion.polyline
        fill="none"
        stroke={BRAND.green}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points="0,16 12,16 18,6 24,26 30,10 36,22 42,16 64,16"
        strokeDasharray="40 160"
        animate={{ strokeDashoffset: [200, 0, -200] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  );
}

// ─── D. 프로그레스 링 ───
function RingLoader({ scale }: { scale: number }) {
  const s = Math.round(48 * scale);
  const r = Math.round(20 * scale);
  const circumference = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: s, height: s }}>
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <circle cx={s / 2} cy={s / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={3 * scale} />
        <motion.circle
          cx={s / 2}
          cy={s / 2}
          r={r}
          fill="none"
          stroke={BRAND.green}
          strokeWidth={3 * scale}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ transformOrigin: 'center' }}
          animate={{
            strokeDashoffset: [circumference, circumference * 0.25, circumference],
            rotate: [-90, 90, 270],
          }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <motion.div
          style={{
            width: 6 * scale,
            height: 6 * scale,
            background: BRAND.green,
            borderRadius: '50%',
          }}
          animate={{ scale: [1, 1.6, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </div>
  );
}

// ─── E. 타이핑 버블 ───
function TypingLoader({ scale }: { scale: number }) {
  return (
    <div
      style={{
        background: '#ecfdf5',
        borderRadius: `${16 * scale}px ${16 * scale}px ${16 * scale}px ${4 * scale}px`,
        padding: `${14 * scale}px ${20 * scale}px`,
        display: 'flex',
        gap: 6 * scale,
        alignItems: 'center',
      }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{
            width: 8 * scale,
            height: 8 * scale,
            borderRadius: '50%',
            background: BRAND.green,
          }}
          animate={{ y: [0, -8 * scale, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

// ─── F. 플로우 웨이브 ───
function WaveLoader({ scale }: { scale: number }) {
  return (
    <div style={{ display: 'flex', gap: 4 * scale, alignItems: 'end', height: 40 * scale }}>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <motion.div
          key={i}
          style={{
            width: 5 * scale,
            borderRadius: 3 * scale,
            background: `linear-gradient(180deg, ${BRAND.green}, ${BRAND.greenLight})`,
          }}
          animate={{ height: [12 * scale, 36 * scale, 12 * scale], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }}
        />
      ))}
    </div>
  );
}

// ─── G. 오르빗 ───
function OrbitLoader({ scale }: { scale: number }) {
  const s = Math.round(52 * scale);
  return (
    <div style={{ position: 'relative', width: s, height: s }}>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 10 * scale,
          height: 10 * scale,
          background: BRAND.green,
          borderRadius: '50%',
        }}
      />
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          border: `1.5px solid rgba(5, 150, 105, 0.15)`,
          borderRadius: '50%',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <div
          style={{
            position: 'absolute',
            top: -3 * scale,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 7 * scale,
            height: 7 * scale,
            background: BRAND.green,
            borderRadius: '50%',
          }}
        />
      </motion.div>
      <motion.div
        style={{
          position: 'absolute',
          inset: 6 * scale,
          border: `1.5px solid rgba(5, 150, 105, 0.15)`,
          borderRadius: '50%',
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      >
        <div
          style={{
            position: 'absolute',
            top: -2.5 * scale,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 5 * scale,
            height: 5 * scale,
            background: BRAND.greenLight,
            borderRadius: '50%',
          }}
        />
      </motion.div>
    </div>
  );
}

// ─── H. 블록 빌드 ───
function BlocksLoader({ scale }: { scale: number }) {
  const s = Math.round(44 * scale);
  const colors = [BRAND.green, BRAND.greenLight, BRAND.greenLight, '#34d399'];
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 4 * scale,
        width: s,
        height: s,
      }}
    >
      {colors.map((color, i) => (
        <motion.div
          key={i}
          style={{ background: color }}
          animate={{ scale: [0, 1, 1, 0], borderRadius: ['50%', '4px', '4px', '50%'] }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.2,
            times: [0, 0.15, 0.85, 1],
          }}
        />
      ))}
    </div>
  );
}

// ─── 메인 컴포넌트 ───
const loaderMap: Record<MotionLoaderVariant, React.FC<{ scale: number }>> = {
  scan: ScanLoader,
  logo: LogoLoader,
  pulse: PulseLoader,
  ring: RingLoader,
  typing: TypingLoader,
  wave: WaveLoader,
  orbit: OrbitLoader,
  blocks: BlocksLoader,
};

export default function MotionLoader({
  variant = 'ring',
  message,
  fullScreen = false,
  size = 'md',
}: MotionLoaderProps) {
  const scale = sizeScale[size];
  const LoaderComponent = loaderMap[variant];

  const content = (
    <motion.div
      className="flex flex-col items-center justify-center gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <LoaderComponent scale={scale} />
      {message && (
        <p className="text-xs text-gray-400 font-medium" style={{ letterSpacing: '-0.2px' }}>
          {message}
        </p>
      )}
    </motion.div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return <div className="flex items-center justify-center py-12">{content}</div>;
}
