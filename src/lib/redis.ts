/**
 * Redis 클라이언트 - RBAC 권한 캐시용
 *
 * @purpose 권한 조회 성능 향상을 위한 Redis 캐싱
 * @context Upstash Redis (서버리스 친화적)
 * @security 환경변수만 사용, 토큰 하드코딩 금지
 */

// ⚠️ 보안: 환경변수만 사용
const REDIS_URL = process.env.REDIS_URL;
const REDIS_TOKEN = process.env.REDIS_TOKEN;

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { ex?: number }): Promise<string>;
  del(...keys: string[]): Promise<number>;
  ping(): Promise<string>;
}

/**
 * Redis 클라이언트 래퍼
 *
 * @purpose Upstash REST API 기반 Redis 클라이언트 (서버리스 환경용)
 * @fallback Redis 없으면 null 반환 (캐시 없이 동작 가능)
 */
class UpstashRedisClient implements RedisClient {
  private baseUrl: string;
  private token: string;

  constructor(url: string, token: string) {
    // Upstash REST API URL 변환
    if (url.startsWith('redis://') || url.startsWith('rediss://')) {
      const parsedUrl = new URL(url);
      this.baseUrl = `https://${parsedUrl.hostname}`;
    } else {
      this.baseUrl = url;
    }
    this.token = token;
  }

  private async request(commands: string[]): Promise<any> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    });

    if (!response.ok) {
      throw new Error(`Redis request failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result?.result;
  }

  async get(key: string): Promise<string | null> {
    try {
      const result = await this.request(['GET', key]);
      return result;
    } catch (error) {
      console.error('[Redis] GET error:', error);
      return null;
    }
  }

  async set(key: string, value: string, options?: { ex?: number }): Promise<string> {
    try {
      const commands = ['SET', key, value];
      if (options?.ex) {
        commands.push('EX', String(options.ex));
      }
      const result = await this.request(commands);
      return result;
    } catch (error) {
      console.error('[Redis] SET error:', error);
      throw error;
    }
  }

  async del(...keys: string[]): Promise<number> {
    try {
      const result = await this.request(['DEL', ...keys]);
      return result;
    } catch (error) {
      console.error('[Redis] DEL error:', error);
      return 0;
    }
  }

  async ping(): Promise<string> {
    try {
      const result = await this.request(['PING']);
      return result;
    } catch (error) {
      console.error('[Redis] PING error:', error);
      return 'ERROR';
    }
  }
}

/**
 * Redis 클라이언트 인스턴스
 *
 * @returns RedisClient 또는 null (Redis 미설정 시)
 */
function createRedisClient(): RedisClient | null {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.warn('[Redis] Redis 환경변수 미설정 - 캐시 없이 동작');
    return null;
  }

  try {
    return new UpstashRedisClient(REDIS_URL, REDIS_TOKEN);
  } catch (error) {
    console.error('[Redis] Redis 클라이언트 생성 실패:', error);
    return null;
  }
}

export const redis = createRedisClient();

/**
 * Redis 키 생성 헬퍼
 */
export const RedisKeys = {
  userPermissions: (userId: string) => `rbac:perms:${userId}`,
  rolePermissions: (roleId: string) => `rbac:role:${roleId}`,
} as const;

/**
 * Redis 캐시 TTL (초)
 */
export const RedisTTL = {
  userPermissions: 60, // 1분
  rolePermissions: 300, // 5분
} as const;
