import { useState, useEffect, useCallback } from 'react';

// CSRF 헤더 이름 (서버와 동일)
const CSRF_HEADER = 'x-csrf-token';

export interface AdminAuthConfig {
  /** API 검증 엔드포인트 (예: '/api/expert-services/verify') */
  apiEndpoint: string;
  /** 인증 상태를 저장할 스토리지 키 (예: 'expertServicesAuth') */
  storageKey: string;
  /** 스토리지 타입 (기본: sessionStorage) */
  storageType?: 'session' | 'local';
  /** 자동 인증 체크 활성화 (기본: true) */
  autoCheck?: boolean;
}

export interface AdminAuthState {
  /** 인증 여부 */
  isAuthenticated: boolean;
  /** 로딩 중 여부 */
  isLoading: boolean;
  /** 에러 메시지 */
  error: string | null;
  /** 로그인 함수 */
  login: (password: string) => Promise<boolean>;
  /** 로그아웃 함수 */
  logout: () => void;
  /** 인증 상태 재확인 */
  refresh: () => Promise<void>;
}

/**
 * 관리자 인증을 위한 공통 Hook
 *
 * @example
 * ```tsx
 * const { isAuthenticated, isLoading, error, login, logout } = useAdminAuth({
 *   apiEndpoint: '/api/expert-services/verify',
 *   storageKey: 'expertServicesAuth',
 *   storageType: 'session'
 * });
 *
 * const handleLogin = async (e: React.FormEvent) => {
 *   e.preventDefault();
 *   const success = await login(password);
 *   if (success) {
 *     // 로그인 성공 처리
 *   }
 * };
 * ```
 */
export function useAdminAuth(config: AdminAuthConfig): AdminAuthState {
  const {
    apiEndpoint,
    storageKey,
    storageType = 'session',
    autoCheck = true,
  } = config;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // 스토리지 헬퍼 (SSR 안전)
  const getStorage = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return storageType === 'local' ? localStorage : sessionStorage;
  }, [storageType]);

  const getStorageItem = useCallback(
    (key: string): string | null => {
      const storage = getStorage();
      if (!storage) return null;
      try {
        return storage.getItem(key);
      } catch (e) {
        console.warn(`Failed to read from ${storageType}Storage:`, e);
        return null;
      }
    },
    [getStorage, storageType]
  );

  const setStorageItem = useCallback(
    (key: string, value: string): void => {
      const storage = getStorage();
      if (!storage) return;
      try {
        storage.setItem(key, value);
      } catch (e) {
        console.warn(`Failed to write to ${storageType}Storage:`, e);
      }
    },
    [getStorage, storageType]
  );

  const removeStorageItem = useCallback(
    (key: string): void => {
      const storage = getStorage();
      if (!storage) return;
      try {
        storage.removeItem(key);
      } catch (e) {
        console.warn(`Failed to remove from ${storageType}Storage:`, e);
      }
    },
    [getStorage, storageType]
  );

  /**
   * CSRF 토큰 가져오기
   */
  const fetchCsrfToken = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/auth/csrf', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          setCsrfToken(data.token);
          return data.token;
        }
      }
    } catch (error) {
      console.error('[useAdminAuth] Failed to fetch CSRF token:', error);
    }
    return null;
  }, []);

  /**
   * 로그인 함수 (CSRF 보호 적용)
   * @param password 비밀번호
   * @returns 성공 여부
   */
  const login = useCallback(
    async (password: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        // CSRF 토큰 가져오기
        const token = await fetchCsrfToken();

        // 요청 헤더 구성
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        // CSRF 토큰이 있으면 헤더에 추가
        if (token) {
          headers[CSRF_HEADER] = token;
        }

        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers,
          credentials: 'include', // 쿠키 포함
          body: JSON.stringify({ password }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setIsAuthenticated(true);
          setStorageItem(storageKey, 'authenticated');
          return true;
        } else {
          const errorMessage = data.message || '비밀번호가 올바르지 않습니다.';
          setError(errorMessage);
          return false;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.';
        setError(errorMessage);
        console.error('[useAdminAuth] Login error:', err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [apiEndpoint, storageKey, setStorageItem, fetchCsrfToken]
  );

  /**
   * 로그아웃 함수
   */
  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setError(null);
    removeStorageItem(storageKey);
  }, [storageKey, removeStorageItem]);

  /**
   * 인증 상태 재확인 (스토리지 기반)
   */
  const refresh = useCallback(async () => {
    // SSR 안전성 체크
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const authStatus = getStorageItem(storageKey);
      if (authStatus === 'authenticated') {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('[useAdminAuth] Refresh error:', err);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [storageKey, getStorageItem]);

  // 초기 인증 상태 확인
  useEffect(() => {
    if (autoCheck) {
      refresh();
    }
  }, [autoCheck, refresh]);

  return {
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    refresh,
  };
}
