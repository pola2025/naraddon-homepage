'use client';

/**
 * 인라인 소형 로딩 인디케이터
 *
 * @purpose 버튼 내부, 텍스트 옆 등 작은 공간의 로딩 표시
 */

import React from 'react';
import { motion } from 'framer-motion';
import { BRAND } from './constants';

interface InlineLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const sizeMap = { sm: 5, md: 7, lg: 9 };

export default function InlineLoader({ size = 'md', color = BRAND.green }: InlineLoaderProps) {
  const dotSize = sizeMap[size];

  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="rounded-full"
          style={{
            width: dotSize,
            height: dotSize,
            backgroundColor: color,
            display: 'inline-block',
          }}
          animate={{
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </span>
  );
}
