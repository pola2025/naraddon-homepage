'use client';

import React from 'react';
import Link from 'next/link';
import styles from './Breadcrumb.module.css';

/**
 * 브레드크럼 네비게이션 컴포넌트
 *
 * @purpose 현재 페이지 위치를 표시하고 상위 페이지로 이동할 수 있게 함
 * @context 심사관 브랜드 페이지에서 전체 목록으로 돌아갈 수 있는 경로 제공
 */

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <ol className={styles.breadcrumbList}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className={styles.breadcrumbItem}>
              {!isLast && item.href ? (
                <>
                  <Link href={item.href} className={styles.breadcrumbLink}>
                    {item.label}
                  </Link>
                  <span className={styles.breadcrumbSeparator} aria-hidden="true">
                    &gt;
                  </span>
                </>
              ) : (
                <span className={styles.breadcrumbCurrent} aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
