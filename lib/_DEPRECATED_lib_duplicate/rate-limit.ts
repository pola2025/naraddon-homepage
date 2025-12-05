/**
 * Rate Limiting 유틸리티
 *
 * 메모리 기반 Rate Limiting 구현
 * - 무차별 대입 공격(Brute Force) 방지
 * - IP 기반 요청 제한
 * - Sliding Window 알고리즘
 *
 * Note: 메모리 기반이므로 서버 재시작 시 초기화됨
 * 프로덕션 환경에서는 Redis (Upstash) 사용 권장
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// IP별 요청 기록 저장소
const requestStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  /** 제한 시간 (초 단위) */
  windowSeconds?: number;
  /** 제한 시간 내 최대 요청 수 */
  maxRequests?: number;
}

export interface RateLimitResult {
  /** 요청 허용 여부 */
  allowed: boolean;
  /** 남은 요청 수 */
  remaining: number;
  /** 제한 해제까지 남은 시간 (초) */
  resetInSeconds: number;
  /** 총 요청 한도 */
  limit: number;
}

/**
 * IP 주소 기반 Rate Limiting 체크
 *
 * @param identifier 고유 식별자 (IP 주소 등)
 * @param config Rate Limit 설정
 * @returns Rate Limit 결과
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = {}
): RateLimitResult {
  const {
    windowSeconds = 60, // 기본: 1분
    maxRequests = 5, // 기본: 5회
  } = config;

  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // 기존 기록 가져오기
  const entry = requestStore.get(identifier);

  // 기록이 없거나 시간 윈도우가 지난 경우
  if (!entry || now > entry.resetTime) {
    const resetTime = now + windowMs;
    requestStore.set(identifier, {
      count: 1,
      resetTime,
    });

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetInSeconds: windowSeconds,
      limit: maxRequests,
    };
  }

  // 요청 횟수 증가
  entry.count += 1;

  // 제한 초과 여부 확인
  const allowed = entry.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - entry.count);
  const resetInSeconds = Math.ceil((entry.resetTime - now) / 1000);

  return {
    allowed,
    remaining,
    resetInSeconds,
    limit: maxRequests,
  };
}

/**
 * 특정 식별자의 Rate Limit 초기화
 * (테스트 또는 관리자 권한으로 제한 해제 시 사용)
 *
 * @param identifier 고유 식별자
 */
export function resetRateLimit(identifier: string): void {
  requestStore.delete(identifier);
}

/**
 * 만료된 항목 정리 (메모리 관리)
 * 주기적으로 호출하여 메모리 누수 방지
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [identifier, entry] of requestStore.entries()) {
    if (now > entry.resetTime) {
      requestStore.delete(identifier);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[RateLimit] Cleaned ${cleaned} expired entries`);
  }
}

// 5분마다 만료된 항목 정리
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}
