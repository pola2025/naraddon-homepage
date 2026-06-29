import { useCallback, useEffect, useMemo, useState } from 'react';

import boardImage1 from '@/assets/images/board/board_image_01.jpg';
import boardImage2 from '@/assets/images/board/board_image_02.jpg';
import boardImage3 from '@/assets/images/board/board_image_03.jpg';
import boardImage4 from '@/assets/images/board/board_image_04.png';

const FALLBACK_IMAGES = [boardImage1, boardImage2, boardImage3, boardImage4];

// 캐시 설정
const CACHE_KEY = 'policyNewsCache';
const CACHE_DURATION = 5 * 60 * 1000; // 5분

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

// 로컬 스토리지 캐시 헬퍼
const getCachedData = (key) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();

    if (now - timestamp > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch {
    return null;
  }
};

const setCachedData = (key, data) => {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  } catch {
    // 스토리지 풀 에러 무시
  }
};

export const normalizePolicyNewsItem = (post, index = 0, fallbackImages = FALLBACK_IMAGES) => {
  const fallbackImage = fallbackImages[index % fallbackImages.length];
  const fallbackSrc = typeof fallbackImage === 'string' ? fallbackImage : fallbackImage?.src;

  const normalizedId = post?._id ?? post?.id ?? `policy-news-${index}`;
  const rawCategory = typeof post?.category === 'string' ? post.category.trim() : '';
  const category = rawCategory.length > 0 ? rawCategory : 'policy';

  const rawThumbnail =
    typeof post?.thumbnail === 'string' && post.thumbnail.trim().length > 0
      ? post.thumbnail.trim()
      : typeof post?.image === 'string' && post.image.trim().length > 0
        ? post.image.trim()
        : fallbackSrc;

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
    thumbnail: rawThumbnail || fallbackSrc || '',
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

export const usePolicyNewsOptimized = ({
  limit = 12,
  fallbackImages = FALLBACK_IMAGES,
  useCache = true,
  cacheKey = CACHE_KEY,
} = {}) => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isStale, setIsStale] = useState(false);

  const fetchPolicyNews = useCallback(
    async (forceRefresh = false) => {
      const controller = new AbortController();

      // 캐시 확인
      if (!forceRefresh && useCache) {
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          setItems(cachedData);
          setIsLoading(false);
          setIsStale(true);

          // 백그라운드에서 데이터 새로고침
          fetch(`/api/policy-news?limit=${limit}`, {
            cache: 'no-store',
            signal: controller.signal,
          })
            .then((res) => res.json())
            .then((payload) => {
              const posts = Array.isArray(payload?.posts) ? payload.posts : [];
              const normalized = posts.map((post, index) =>
                normalizePolicyNewsItem(post, index, fallbackImages)
              );
              setItems(normalized);
              setCachedData(cacheKey, normalized);
              setIsStale(false);
            })
            .catch(() => {
              // 백그라운드 업데이트 실패는 무시
            });

          return { controller };
        }
      }

      setIsLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/policy-news?limit=${limit}`, {
          cache: forceRefresh ? 'no-store' : 'force-cache',
          signal: controller.signal,
          next: { revalidate: 300 }, // 5분마다 재검증
        });

        if (!response.ok) {
          throw new Error('정책 소식을 불러오는데 실패했습니다.');
        }

        const payload = await response.json();
        const posts = Array.isArray(payload?.posts) ? payload.posts : [];
        const normalized = posts.map((post, index) =>
          normalizePolicyNewsItem(post, index, fallbackImages)
        );

        setItems(normalized);
        if (useCache) {
          setCachedData(cacheKey, normalized);
        }
        setIsStale(false);

        return { controller };
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          return { controller };
        }
        console.error(fetchError);
        setError('정책소식 정보를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');

        // 캐시된 데이터가 있으면 사용
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          setItems(cachedData);
          setIsStale(true);
        } else {
          setItems([]);
        }

        return { controller };
      } finally {
        setIsLoading(false);
      }
    },
    [fallbackImages, limit, useCache, cacheKey]
  );

  useEffect(() => {
    let abortController = new AbortController();

    const execute = async () => {
      const { controller } = await fetchPolicyNews();
      abortController = controller;
    };

    execute();

    return () => {
      abortController.abort();
    };
  }, [fetchPolicyNews]);

  const refetch = useCallback(
    (forceRefresh = true) => {
      return fetchPolicyNews(forceRefresh);
    },
    [fetchPolicyNews]
  );

  const meta = useMemo(
    () => ({
      total: items.length,
      pinned: items.filter((item) => item.isPinned).length,
      isStale,
    }),
    [items, isStale]
  );

  return {
    items,
    isLoading,
    error,
    refetch,
    meta,
  };
};

export default usePolicyNewsOptimized;
