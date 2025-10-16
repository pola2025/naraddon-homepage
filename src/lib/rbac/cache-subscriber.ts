/**
 * RBAC 캐시 무효화 구독자 (Pub/Sub Listener)
 *
 * @purpose 다중 인스턴스 환경에서 다른 인스턴스의 캐시 무효화 메시지를 수신하여 로컬 캐시 삭제
 * @architecture Vercel 서버리스 환경에서는 전통적인 long-lived connection이 어려우므로,
 *               각 요청마다 캐시 조회 전에 짧은 timeout으로 구독 확인하는 방식 사용
 * @security 무효화 메시지는 userId만 포함 (PII 최소화)
 */

import { redis, RedisKeys } from '@/lib/redis';

/**
 * 무효화 메시지 타입
 */
interface InvalidationMessage {
  userId: string;
  email?: string;
  bulk?: boolean;
  userIds?: string[];
  timestamp?: number;
}

/**
 * 마지막 구독 확인 시간 (메모리 캐시)
 * @purpose 매 요청마다 구독하지 않고 일정 주기로만 확인
 */
let lastSubscriptionCheck = 0;
const SUBSCRIPTION_CHECK_INTERVAL = 5000; // 5초마다 확인

/**
 * 캐시 무효화 메시지 처리
 *
 * @purpose PUBLISH된 무효화 메시지를 받아 로컬 캐시 삭제
 * @param message 무효화 메시지 (JSON 문자열)
 */
async function handleInvalidationMessage(message: string): Promise<void> {
  if (!redis) return;

  try {
    const data: InvalidationMessage = JSON.parse(message);

    if (data.bulk && data.userIds) {
      // 대량 무효화
      const keys: string[] = [];
      for (const userId of data.userIds) {
        keys.push(RedisKeys.userPermissions(userId));
      }
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`[RBAC Subscriber] Bulk invalidated ${keys.length} users`);
      }
    } else if (data.userId) {
      // 단일 사용자 무효화
      const keysToDelete: string[] = [RedisKeys.userPermissions(data.userId)];

      if (data.email) {
        keysToDelete.push(RedisKeys.recoveredUserId(data.email));
      }

      await redis.del(...keysToDelete);
      console.log(
        `[RBAC Subscriber] Invalidated cache for user: ${data.userId.substring(0, 8)}...`
      );
    }
  } catch (error) {
    console.error('[RBAC Subscriber] Message handling failed:', error);
    // 실패해도 계속 진행 (다음 조회 시 TTL로 자동 갱신)
  }
}

/**
 * Pub/Sub 구독 초기화 (서버리스 환경 대응)
 *
 * @purpose Upstash Redis REST API는 전통적인 SUBSCRIBE를 지원하지 않으므로,
 *          대안으로 각 요청 시작 시 짧은 시간 동안 polling 방식으로 메시지 확인
 * @note 프로덕션에서는 Vercel Edge Config나 별도 WebSocket 서버 고려 필요
 */
export async function initCacheSubscriber(): Promise<void> {
  // 서버리스 환경에서는 long-lived connection 불가능
  // 대신 각 요청마다 최근 무효화 메시지를 확인하는 방식 사용

  console.log('[RBAC Subscriber] Cache subscriber initialized (serverless mode)');
}

/**
 * 최근 무효화 메시지 확인 (서버리스 대응)
 *
 * @purpose 매 요청마다 호출되지만, 실제로는 일정 주기로만 확인
 * @note Upstash Redis REST API는 SUBSCRIBE를 지원하지 않으므로,
 *       실제 프로덕션에서는 다음 방법 중 하나 선택:
 *       1. Vercel Edge Config + Webhook
 *       2. Redis Streams (XREAD)
 *       3. 별도 WebSocket 서버
 *       4. TTL 기반 자동 갱신 (현재 방식)
 */
export async function checkRecentInvalidations(): Promise<void> {
  const now = Date.now();

  // 일정 주기로만 확인 (과도한 Redis 호출 방지)
  if (now - lastSubscriptionCheck < SUBSCRIPTION_CHECK_INTERVAL) {
    return;
  }

  lastSubscriptionCheck = now;

  // 실제 구현은 Redis Streams 또는 다른 메커니즘 필요
  // 현재는 TTL 기반 자동 만료로 충분
}

/**
 * 수동 캐시 무효화 트리거 (테스트용)
 *
 * @purpose 개발/테스트 환경에서 무효화 동작 확인
 */
export async function triggerTestInvalidation(userId: string, email?: string): Promise<void> {
  if (!redis) {
    console.warn('[RBAC Subscriber] Redis not available');
    return;
  }

  const message: InvalidationMessage = {
    userId,
    email,
    timestamp: Date.now(),
  };

  await redis.publish('rbac:invalidate', JSON.stringify(message));
  console.log(`[RBAC Subscriber] Test invalidation published for user: ${userId.substring(0, 8)}...`);
}

/**
 * 중요 참고사항:
 *
 * Upstash Redis REST API는 전통적인 SUBSCRIBE/PSUBSCRIBE를 지원하지 않습니다.
 * 따라서 실제 다중 인스턴스 동기화를 위해서는 다음 방법 중 하나를 선택해야 합니다:
 *
 * 1. **Redis Streams (XREAD)**: PUBLISH 대신 XADD 사용, 각 인스턴스가 주기적으로 XREAD
 *    - 장점: REST API로 polling 가능
 *    - 단점: 약간의 지연 (1-5초)
 *
 * 2. **Vercel Edge Config + Webhook**: 역할 변경 시 Edge Config 업데이트 + Webhook으로 재배포 트리거
 *    - 장점: Vercel 네이티브 기능
 *    - 단점: 잦은 재배포는 비효율적
 *
 * 3. **TTL 기반 자동 만료 (현재 방식)**: PUBLISH는 로깅용, 실제 동기화는 5분 TTL로 해결
 *    - 장점: 구현 간단, 서버리스 친화적
 *    - 단점: 최대 5분 지연
 *
 * 4. **별도 WebSocket 서버**: 전통적인 Redis SUBSCRIBE를 사용하는 Node.js 서버 운영
 *    - 장점: 실시간 동기화
 *    - 단점: 인프라 추가 필요
 *
 * **현재 구현**: TTL 기반 자동 만료 (5분)
 * **권장 개선**: Redis Streams (XADD/XREAD) 또는 TTL 유지
 */
