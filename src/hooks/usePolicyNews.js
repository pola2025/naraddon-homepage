import { useCallback, useEffect, useMemo, useState } from 'react';

import { sanitizeImageUrl } from '@/utils/imageUrlSanitizer';

/**
 * 정책소식 Hook - 랜덤 이미지 사용 안 함
 *
 * @purpose 업로드된 이미지만 표시, fallback 이미지 완전 제거
 * @context 사용자가 업로드한 이미지가 없으면 placeholder 표시
 */

const decodeHtmlEntities = (value = '') =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));

const stripHtml = (value = '') =>
  decodeHtmlEntities(value)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const formatDate = (value) => {
  if (!value) {
    return '날짜 미확인';
  }

  const ensureDate = (raw) => {
    if (raw instanceof Date) {
      return raw;
    }

    if (typeof raw === 'string') {
      const trimmed = raw.trim();

      if (/^\d{4}\.\d{2}\.\d{2}$/.test(trimmed)) {
        const [year, month, day] = trimmed.split('.');
        return new Date(Number(year), Number(month) - 1, Number(day));
      }

      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return new Date(trimmed);
      }

      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return null;
  };

  const parsedDate = ensureDate(value);
  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    return '날짜 미확인';
  }

  return parsedDate.toLocaleDateString('ko-KR');
};

const ensureArray = (maybeArray) => (Array.isArray(maybeArray) ? maybeArray : []);

export const normalizePolicyNewsItem = (post, index = 0) => {
  /**
   * 썸네일 이미지 처리
   *
   * @purpose 사용자가 업로드한 이미지만 사용
   * @context fallback 이미지 완전 제거 - 랜덤 이미지 사용 안 함
   * @fix 업로드된 이미지가 없으면 빈 문자열 반환하여 컴포넌트에서 placeholder 처리
   */
  const normalizedId = post?._id ?? post?.id ?? `policy-news-${index}`;
  const rawCategory = typeof post?.category === 'string' ? post.category.trim() : '';
  const category = rawCategory.length > 0 ? rawCategory : 'policy';

  // 업로드된 이미지만 사용, fallback 이미지 사용 안 함
  let rawThumbnail = '';
  if (typeof post?.thumbnail === 'string' && post.thumbnail.trim().length > 0) {
    rawThumbnail = sanitizeImageUrl(post.thumbnail.trim());
  } else if (typeof post?.image === 'string' && post.image.trim().length > 0) {
    rawThumbnail = sanitizeImageUrl(post.image.trim());
  }
  // 업로드된 이미지가 없으면 빈 문자열 (컴포넌트에서 placeholder 처리)

  const baseContent = typeof post?.content === 'string' ? post.content : '';
  const primaryExcerpt = typeof post?.excerpt === 'string' ? post.excerpt : '';
  const descriptionSource =
    typeof post?.description === 'string' && post.description.trim().length > 0
      ? post.description.trim()
      : primaryExcerpt || baseContent;
  const description = stripHtml(descriptionSource);

  const excerptSource = stripHtml(primaryExcerpt || descriptionSource || baseContent);
  const excerpt =
    excerptSource.length > 160 ? `${excerptSource.slice(0, 160).trim()}…` : excerptSource;

  const views = typeof post?.views === 'number' ? post.views : Number(post?.viewCount) || 0;
  const likes = typeof post?.likes === 'number' ? post.likes : Number(post?.likeCount) || 0;
  const comments =
    typeof post?.comments === 'number' ? post.comments : Number(post?.commentCount) || 0;

  const createdAt = post?.createdAt ?? post?.date ?? null;

  return {
    id: String(normalizedId),
    title:
      typeof post?.title === 'string' && post.title.trim().length > 0
        ? post.title.trim()
        : '정책 소식',
    content: baseContent,
    description: description || '현재 확인 가능한 내용이 없습니다.',
    excerpt,
    category,
    badge: typeof post?.badge === 'string' ? post.badge.trim() : '',
    thumbnail: rawThumbnail || '',
    tags: ensureArray(post?.tags),
    isMain: Boolean(post?.isMain),
    isPinned: Boolean(post?.isPinned),
    views,
    likes,
    comments,
    createdAt,
    dateText: formatDate(createdAt),
  };
};

/**
 * usePolicyNews 훅
 *
 * @param {Object} options
 * @param {number} options.limit - 가져올 게시물 수
 * @param {Array} options.initialData - 서버에서 미리 가져온 데이터 (optional)
 * @returns {Object} { items, isLoading, error, refetch, meta }
 */
export const usePolicyNews = ({ limit = 12, initialData } = {}) => {
  // initialData가 있으면 normalize하여 사용, 없으면 빈 배열
  const normalized = useMemo(() => {
    if (initialData && Array.isArray(initialData) && initialData.length > 0) {
      return initialData.map((post, index) => normalizePolicyNewsItem(post, index));
    }
    return [];
  }, [initialData]);

  const [items, setItems] = useState(normalized);
  const [isLoading, setIsLoading] = useState(!initialData); // initialData 있으면 로딩 안함
  const [error, setError] = useState('');

  const fetchPolicyNews = useCallback(async () => {
    const controller = new AbortController();
    setIsLoading(true);
    setError('');

    try {
      // fields 파라미터 추가 (성능 최적화)
      const response = await fetch(`/api/policy-news?limit=${limit}&fields=minimal`, {
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('정책 소식을 불러오는데 실패했습니다.');
      }

      const payload = await response.json();
      const posts = Array.isArray(payload?.posts) ? payload.posts : [];
      const normalized = posts.map((post, index) => normalizePolicyNewsItem(post, index));
      setItems(normalized);
      return { controller };
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return { controller };
      }
      console.error(fetchError);
      setError('정책소식 정보를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
      setItems([]);
      return { controller };
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    // initialData가 있으면 API 호출 스킵
    if (initialData && Array.isArray(initialData) && initialData.length > 0) {
      return;
    }

    let abortController = new AbortController();

    const execute = async () => {
      const { controller } = await fetchPolicyNews();
      abortController = controller;
    };

    execute();

    return () => {
      abortController.abort();
    };
  }, [fetchPolicyNews, initialData]);

  const refetch = useCallback(() => {
    return fetchPolicyNews();
  }, [fetchPolicyNews]);

  const meta = useMemo(
    () => ({
      total: items.length,
      pinned: items.filter((item) => item.isPinned).length,
    }),
    [items]
  );

  return {
    items,
    isLoading,
    error,
    refetch,
    meta,
  };
};

export default usePolicyNews;
