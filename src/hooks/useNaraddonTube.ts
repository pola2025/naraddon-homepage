import { useCallback, useEffect, useState, useMemo } from 'react';

type TubeVideo = {
  title: string;
  youtubeId: string;
  url: string;
  customThumbnail?: string;
};

type TubeEntry = {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  thumbnailUrl: string;
  videos: TubeVideo[];
};

// 캐시 설정
const CACHE_KEY = 'naraddonTubeCache';
const CACHE_DURATION = 10 * 60 * 1000; // 10분

// 로컬 스토리지 캐시 헬퍼
const getCachedData = (key: string): TubeEntry[] | null => {
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

const setCachedData = (key: string, data: TubeEntry[]) => {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch {
    // 스토리지 풀 에러 무시
  }
};

interface UseNaraddonTubeOptions {
  useCache?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useNaraddonTube = ({
  useCache = true,
  autoRefresh = false,
  refreshInterval = 5 * 60 * 1000 // 5분
}: UseNaraddonTubeOptions = {}) => {
  const [entries, setEntries] = useState<TubeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetchEntries = useCallback(async (forceRefresh = false) => {
    const controller = new AbortController();

    // 캐시 확인
    if (!forceRefresh && useCache) {
      const cachedData = getCachedData(CACHE_KEY);
      if (cachedData) {
        setEntries(cachedData);
        setIsLoading(false);
        setIsStale(true);

        // 백그라운드에서 데이터 새로고침
        fetch('/api/naraddon-tube', {
          cache: 'default',
          signal: controller.signal,
        })
          .then(res => res.json())
          .then(data => {
            if (data?.entries) {
              setEntries(data.entries);
              setCachedData(CACHE_KEY, data.entries);
              setIsStale(false);
            }
          })
          .catch(() => {
            // 백그라운드 업데이트 실패는 무시
          });

        return controller;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/naraddon-tube', {
        cache: forceRefresh ? 'no-store' : 'force-cache',
        signal: controller.signal,
        next: { revalidate: 300 } // 5분마다 재검증
      });

      if (!response.ok) {
        throw new Error('영상 목록을 불러오는 데 실패했습니다.');
      }

      const data = await response.json();

      if (data?.entries) {
        setEntries(data.entries);
        if (useCache) {
          setCachedData(CACHE_KEY, data.entries);
        }
        setIsStale(false);
      } else {
        setEntries([]);
      }
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return controller;
      }

      console.error('NaraddonTube fetch error:', fetchError);
      setError('영상 정보를 불러오는 중 문제가 발생했습니다.');

      // 캐시된 데이터가 있으면 사용
      const cachedData = getCachedData(CACHE_KEY);
      if (cachedData) {
        setEntries(cachedData);
        setIsStale(true);
      } else {
        setEntries([]);
      }
    } finally {
      setIsLoading(false);
    }

    return controller;
  }, [useCache]);

  useEffect(() => {
    let controller: AbortController | null = null;

    const load = async () => {
      controller = await fetchEntries();
    };

    load();

    // 자동 새로고침 설정
    let refreshTimer: NodeJS.Timeout | null = null;
    if (autoRefresh && refreshInterval > 0) {
      refreshTimer = setInterval(() => {
        fetchEntries(true);
      }, refreshInterval);
    }

    return () => {
      controller?.abort();
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, [fetchEntries, autoRefresh, refreshInterval]);

  const refetch = useCallback((forceRefresh = true) => {
    return fetchEntries(forceRefresh);
  }, [fetchEntries]);

  const meta = useMemo(() => ({
    total: entries.length,
    isStale,
    hasCache: !!getCachedData(CACHE_KEY)
  }), [entries.length, isStale]);

  return {
    entries,
    isLoading,
    error,
    refetch,
    meta
  };
};

export default useNaraddonTube;
