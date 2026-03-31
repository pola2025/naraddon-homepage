/**
 * MongoDB 기반 Rate Limiter
 *
 * @purpose Vercel serverless에서도 동작하는 영속적 rate limiting
 * @context 기존 in-memory Map 방식은 cold start마다 리셋됨 → MongoDB로 교체
 */

import clientPromise from '@/lib/mongodb-client';

export interface RateLimitOptions {
  /** 식별 키 (예: `${ip}:${pathname}`) */
  key: string;
  /** 윈도우 내 최대 요청 수 */
  maxRequests: number;
  /** 윈도우 길이 (초) */
  windowSeconds: number;
  /** 컬렉션명 (기본: 'rate-limits') */
  collection?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  /** 차단 시 재시도까지 남은 초 */
  retryAfterSeconds?: number;
  /** 현재 윈도우 내 요청 수 */
  current?: number;
}

/**
 * MongoDB 기반 rate limit 체크
 *
 * TTL 인덱스로 자동 정리됨 — 별도 cleanup 불필요
 */
// 인덱스 생성 여부 캐시 (프로세스 수명 동안 유지)
const indexCreated = new Set<string>();

export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const { key, maxRequests, windowSeconds, collection = 'rate-limits' } = options;

  try {
    const client = await clientPromise;
    const db = client.db('naraddon');
    const col = db.collection(collection);

    // TTL 인덱스 보장 (프로세스당 최초 1회만 실행)
    if (!indexCreated.has(collection)) {
      await col
        .createIndex({ createdAt: 1 }, { expireAfterSeconds: windowSeconds })
        .catch(() => {});
      indexCreated.add(collection);
    }

    const windowStart = new Date(Date.now() - windowSeconds * 1000);
    const count = await col.countDocuments({ key, createdAt: { $gte: windowStart } });

    if (count >= maxRequests) {
      const oldest = await col.findOne(
        { key, createdAt: { $gte: windowStart } },
        { sort: { createdAt: 1 } }
      );
      const retryAfterSeconds = oldest
        ? Math.ceil((oldest.createdAt.getTime() + windowSeconds * 1000 - Date.now()) / 1000)
        : windowSeconds;

      return { allowed: false, retryAfterSeconds, current: count };
    }

    return { allowed: true, current: count };
  } catch {
    // DB 오류 시 통과 (가용성 우선)
    return { allowed: true };
  }
}

/** rate limit 카운트 기록 */
export async function recordRateLimitHit(
  key: string,
  collection: string = 'rate-limits'
): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db('naraddon');
    await db.collection(collection).insertOne({ key, createdAt: new Date() });
  } catch {
    // 기록 실패는 무시
  }
}
