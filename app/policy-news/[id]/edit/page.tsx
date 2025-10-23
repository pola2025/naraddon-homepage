'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import PolicyNewsWrite from '@/components/PolicyNewsWrite/PolicyNewsWrite';

/**
 * 정책소식 수정 페이지
 *
 * @purpose 기존 정책소식 게시글 수정 기능 제공
 * @context 관리자는 모든 게시글 수정 가능, 작성자는 본인 게시글만 수정 가능
 * @note PolicyNewsWrite 컴포넌트를 edit 모드로 재사용
 */
export default function PolicyNewsEditPage() {
  const params = useParams();
  const postId = params?.id as string;

  return <PolicyNewsWrite postId={postId} mode="edit" />;
}
