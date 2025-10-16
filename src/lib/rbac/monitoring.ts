/**
 * RBAC 시스템 모니터링 및 메트릭 수집
 *
 * @purpose 캐시 히트율, DB 쿼리 시간, 권한 거부율 등 추적
 * @usage import { rbacMetrics, recordCacheHit } from '@/lib/rbac/monitoring'
 */

export interface RBACMetrics {
  cacheHit: number;
  cacheMiss: number;
  dbQueryTimes: number[]; // ms 단위
  permissionDenied: number;
  permissionGranted: number;
  invalidations: number;
  errors: number;
  startTime: number;
}

// 메트릭 저장소 (메모리)
export const rbacMetrics: RBACMetrics = {
  cacheHit: 0,
  cacheMiss: 0,
  dbQueryTimes: [],
  permissionDenied: 0,
  permissionGranted: 0,
  invalidations: 0,
  errors: 0,
  startTime: Date.now(),
};

/**
 * 캐시 HIT 기록
 */
export function recordCacheHit(userId: string) {
  rbacMetrics.cacheHit++;
  console.log(`[RBAC] Cache HIT - userId: ${userId.substring(0, 8)}...`);
}

/**
 * 캐시 MISS 기록
 */
export function recordCacheMiss(userId: string) {
  rbacMetrics.cacheMiss++;
  console.log(`[RBAC] Cache MISS - userId: ${userId.substring(0, 8)}...`);
}

/**
 * DB 쿼리 시간 기록
 */
export function recordDbQueryTime(userId: string, timeMs: number) {
  rbacMetrics.dbQueryTimes.push(timeMs);

  // 최근 1000개만 유지 (메모리 제한)
  if (rbacMetrics.dbQueryTimes.length > 1000) {
    rbacMetrics.dbQueryTimes.shift();
  }

  console.log(`[RBAC] DB query - userId: ${userId.substring(0, 8)}..., time: ${timeMs}ms`);

  // 느린 쿼리 경고 (200ms 이상)
  if (timeMs > 200) {
    console.warn(`[RBAC] Slow query detected: ${timeMs}ms for user ${userId.substring(0, 8)}...`);
  }
}

/**
 * 권한 거부 기록
 */
export function recordPermissionDenied(userId: string, permission: string) {
  rbacMetrics.permissionDenied++;
  console.warn(`[RBAC] Permission DENIED - userId: ${userId.substring(0, 8)}..., permission: ${permission}`);
}

/**
 * 권한 승인 기록
 */
export function recordPermissionGranted(userId: string, permission: string) {
  rbacMetrics.permissionGranted++;
  console.log(`[RBAC] Permission GRANTED - userId: ${userId.substring(0, 8)}..., permission: ${permission}`);
}

/**
 * 캐시 무효화 기록
 */
export function recordInvalidation(userId: string, reason?: string) {
  rbacMetrics.invalidations++;
  const reasonMsg = reason ? ` (${reason})` : '';
  console.log(`[RBAC] Cache INVALIDATED - userId: ${userId.substring(0, 8)}...${reasonMsg}`);
}

/**
 * 에러 기록
 */
export function recordError(error: Error, context?: string) {
  rbacMetrics.errors++;
  const contextMsg = context ? ` [${context}]` : '';
  console.error(`[RBAC] Error${contextMsg}:`, error.message);
}

/**
 * 통계 계산
 */
export function getRBACStats() {
  const totalRequests = rbacMetrics.cacheHit + rbacMetrics.cacheMiss;
  const hitRate = totalRequests > 0
    ? ((rbacMetrics.cacheHit / totalRequests) * 100).toFixed(2)
    : '0.00';

  const totalPermissionChecks = rbacMetrics.permissionGranted + rbacMetrics.permissionDenied;
  const denyRate = totalPermissionChecks > 0
    ? ((rbacMetrics.permissionDenied / totalPermissionChecks) * 100).toFixed(2)
    : '0.00';

  const avgDbTime = rbacMetrics.dbQueryTimes.length > 0
    ? (rbacMetrics.dbQueryTimes.reduce((a, b) => a + b, 0) / rbacMetrics.dbQueryTimes.length).toFixed(2)
    : '0.00';

  const p95DbTime = rbacMetrics.dbQueryTimes.length > 0
    ? calculatePercentile(rbacMetrics.dbQueryTimes, 95).toFixed(2)
    : '0.00';

  const p99DbTime = rbacMetrics.dbQueryTimes.length > 0
    ? calculatePercentile(rbacMetrics.dbQueryTimes, 99).toFixed(2)
    : '0.00';

  const uptime = Math.floor((Date.now() - rbacMetrics.startTime) / 1000); // seconds
  const uptimeFormatted = formatUptime(uptime);

  return {
    uptime: uptimeFormatted,
    cache: {
      hitRate: `${hitRate}%`,
      totalRequests,
      hits: rbacMetrics.cacheHit,
      misses: rbacMetrics.cacheMiss,
    },
    database: {
      avgQueryTime: `${avgDbTime}ms`,
      p95QueryTime: `${p95DbTime}ms`,
      p99QueryTime: `${p99DbTime}ms`,
      totalQueries: rbacMetrics.dbQueryTimes.length,
    },
    permissions: {
      denyRate: `${denyRate}%`,
      totalChecks: totalPermissionChecks,
      granted: rbacMetrics.permissionGranted,
      denied: rbacMetrics.permissionDenied,
    },
    invalidations: rbacMetrics.invalidations,
    errors: rbacMetrics.errors,
  };
}

/**
 * 백분위수 계산
 */
function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Uptime 포맷팅
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * 메트릭 리셋 (관리자 전용)
 */
export function resetMetrics() {
  rbacMetrics.cacheHit = 0;
  rbacMetrics.cacheMiss = 0;
  rbacMetrics.dbQueryTimes = [];
  rbacMetrics.permissionDenied = 0;
  rbacMetrics.permissionGranted = 0;
  rbacMetrics.invalidations = 0;
  rbacMetrics.errors = 0;
  rbacMetrics.startTime = Date.now();

  console.log('[RBAC] Metrics reset');
}
