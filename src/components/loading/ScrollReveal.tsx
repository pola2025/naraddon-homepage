'use client';

/**
 * 스크롤 등장 애니메이션 (KPEC 스타일)
 *
 * @purpose 뷰포트 진입 시 부드러운 fade + slide 등장
 * @context framer-motion whileInView, 방향별 slide 지원
 */

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { EASE_SMOOTH } from './constants';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  duration?: number;
  once?: boolean;
}

export default function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = 'up',
  distance = 40,
  duration = 0.6,
  once = true,
}: ScrollRevealProps) {
  const directions = {
    up: { y: distance, x: 0 },
    down: { y: -distance, x: 0 },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
  };

  const offset = directions[direction];

  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, margin: '-60px' }}
      transition={{ duration, delay, ease: EASE_SMOOTH as unknown as number[] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** 자식 요소를 순차적으로 등장시키는 컨테이너 */
export function StaggerContainer({
  children,
  className,
  stagger = 0.1,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={{
        visible: { transition: { staggerChildren: stagger } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** StaggerContainer 내부의 개별 아이템 */
export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: EASE_SMOOTH as unknown as number[] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
