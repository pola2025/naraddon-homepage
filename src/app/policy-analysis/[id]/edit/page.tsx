'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PolicyAnalysisEdit from '@/components/policy/PolicyAnalysisEdit';

export default function PolicyAnalysisEditPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/policy-analysis/${params.id}`);
        if (!response.ok) {
          throw new Error('게시글을 불러올 수 없습니다.');
        }
        const data = await response.json();
        setPost(data.post);
      } catch (error) {
        console.error('Error fetching post:', error);
        alert('게시글을 불러오는 중 오류가 발생했습니다.');
        router.push(`/policy-analysis/${params.id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [params.id, router]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh'
      }}>
        <div>게시글을 불러오는 중...</div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return <PolicyAnalysisEdit postId={params.id} initialData={post} />;
}