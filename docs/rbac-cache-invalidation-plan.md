# RBAC 캐시 무효화 및 보안 강화 구현 계획서

## 📋 개요

**목적**: Redis 캐시 기반 RBAC 시스템의 안정성, 보안, 성능을 강화
**현재 상태**: Redis 캐시 + 스탬피드 방지 적용됨 (TTL 1시간)
**문제점**: 역할 변경 시 캐시 무효화 없음, 모니터링 없음, TTL 너무 김
**우선순위**: 필수(🚨) → 권장(⚠️) → 선택(💡)

---

## 🚨 Phase 1: 필수 보완 사항 (즉시 적용)

### 1.1 역할 변경 시 캐시 무효화 로직

**문제**:
- 관리자가 사용자 역할을 변경해도 Redis 캐시가 1시간 동안 유지됨
- 권한 부여/회수가 즉시 반영되지 않아 보안 리스크 존재

**해결 방안**:
```typescript
// src/lib/rbac/cache-invalidation.ts (신규 생성)
/**
 * 사용자 권한 캐시 무효화
 *
 * @purpose 역할 변경 시 즉시 권한 캐시 삭제
 * @usage await invalidateUserPermissions(userId)
 */
export async function invalidateUserPermissions(userId: string): Promise<void> {
  if (!redis) return;

  try {
    // 1. 권한 캐시 삭제
    await redis.del(RedisKeys.userPermissions(userId));

    // 2. 세션 복구 캐시 삭제 (userId 기반으로 email을 찾아야 함)
    // TODO: userId → email 매핑 필요하면 추가

    console.log(`[RBAC] Invalidated cache for user: ${userId.substring(0, 8)}...`);
  } catch (error) {
    console.error('[RBAC] Cache invalidation failed:', error);
    // 실패해도 계속 진행 (다음 조회 시 DB에서 최신 정보 로드)
  }
}

/**
 * 역할 변경 헬퍼 (트랜잭션 + 캐시 무효화)
 */
export async function changeUserRole(
  userId: string,
  newRoleId: string,
  options?: { expiresAt?: Date }
): Promise<void> {
  // 1. MongoDB 트랜잭션으로 역할 변경
  const client = await clientPromise;
  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      const db = client.db('naraddon');

      // 기존 역할 제거 (또는 만료 처리)
      await db.collection('user_roles').updateMany(
        { userId: new mongoose.Types.ObjectId(userId) },
        { $set: { expiresAt: new Date() } },
        { session }
      );

      // 새 역할 부여
      await db.collection('user_roles').insertOne(
        {
          userId: new mongoose.Types.ObjectId(userId),
          roleId: new mongoose.Types.ObjectId(newRoleId),
          grantedAt: new Date(),
          expiresAt: options?.expiresAt || null,
        },
        { session }
      );

      // users 컬렉션의 roles_updated_at 업데이트 (선택사항)
      await db.collection('users').updateOne(
        { _id: new mongoose.Types.ObjectId(userId) },
        { $set: { roles_updated_at: new Date() } },
        { session }
      );
    });

    // 2. 트랜잭션 성공 후 캐시 무효화
    await invalidateUserPermissions(userId);

  } finally {
    await session.endSession();
  }
}
```

**적용 위치**:
- 향후 관리자 페이지에서 역할 변경 API 작성 시 사용
- 예: `POST /api/admin/users/[userId]/role`

**검증 방법**:
1. 사용자 A를 admin → user로 변경
2. 즉시 해당 사용자로 권한 필요 API 호출
3. 권한 거부되어야 함 (1시간 기다리지 않고)

---

### 1.2 락(Lock) 안전성 강화

**현재 상태**:
```typescript
// ✅ 이미 적용됨
const lockAcquired = await redis.set(lockKey, '1', {
  nx: true,
  ex: RedisTTL.recoveryLock  // 5초
});
```

**개선 필요 사항**:
```typescript
// src/lib/auth/authOptions.ts (Session callback)
// ✅ 이미 finally에서 락 해제 중 - 추가 개선 불필요

// 단, 분산 환경(여러 Vercel 인스턴스)에서 완벽한 락을 원하면:
// - Redlock 알고리즘 고려 (복잡도 증가)
// - 현재 구현으로 충분함 (동일 사용자 동시 요청은 드뭄)
```

**결론**: 현재 구현 충분 ✅

---

### 1.3 보안: 로그 마스킹 강화

**현재 상태**:
```typescript
// ✅ 이미 적용됨
if (!isProduction) {
  console.log(`[Session] userId loaded from cache: ${email.substring(0, 3)}***`);
}
```

**추가 권장**:
```typescript
// src/lib/utils/logger.ts (신규 생성)
/**
 * 안전한 로깅 헬퍼
 */
export function maskEmail(email: string): string {
  if (!email) return '***';
  const [local, domain] = email.split('@');
  return `${local.substring(0, Math.min(3, local.length))}***@${domain || '***'}`;
}

export function maskUserId(userId: string): string {
  if (!userId || userId.length < 8) return '***';
  return userId.substring(0, 8) + '...';
}

// 사용 예
console.log(`[Session] User: ${maskEmail(email)}, ID: ${maskUserId(userId)}`);
```

**적용 위치**: `authOptions.ts` 세션 콜백

---

## ⚠️ Phase 2: 권장 보완 사항 (1주일 내)

### 2.1 TTL 최적화 (1시간 → 5분)

**현재 문제**:
- `recoveredUserId` TTL: 3600초 (1시간)
- 역할 변경 시 최대 1시간 지연 (캐시 무효화 없을 경우)

**변경 제안**:
```typescript
// src/lib/redis.ts
export const RedisTTL = {
  userPermissions: 60,        // 1분 (기존)
  rolePermissions: 300,       // 5분 (기존)
  recoveredUserId: 300,       // 5분 (변경: 1시간 → 5분) ⭐
  recoveryLock: 5,            // 5초 (기존)
} as const;
```

**근거**:
- 5분이면 충분히 DB 부하 감소 (96% 감소)
- 역할 변경 즉시성 향상 (1시간 → 5분)
- 캐시 무효화와 함께 사용하면 즉시 반영 가능

**트레이드오프**:
| TTL | DB 절약 | 즉시성 | 권장 상황 |
|-----|---------|--------|-----------|
| 1분 | 98.3% | 최대 1분 지연 | 권한 변경 빈번 |
| 5분 | 96.7% | 최대 5분 지연 | 균형잡힌 선택 ⭐ |
| 1시간 | 99.9% | 최대 1시간 지연 | 권한 거의 변경 안됨 |

**결정**: 5분으로 변경 권장 ⚠️

---

### 2.2 세션 신선도 검증 (Token vs DB)

**목적**: 오래된 JWT가 최신 권한과 불일치하지 않도록 보장

**구현**:
```typescript
// src/lib/auth/authOptions.ts (Session callback)
async session({ session, token }) {
  // ... 기존 로직 ...

  // ⭐ 신규: 토큰 신선도 검증
  if (userId && token.iat) {
    try {
      const client = await clientPromise;
      const db = client.db('naraddon');
      const user = await db.collection('users').findOne(
        { _id: new mongoose.Types.ObjectId(userId) },
        { projection: { roles_updated_at: 1 } }
      );

      // 토큰 발급 시간 vs 역할 변경 시간 비교
      const tokenIssuedAt = new Date(token.iat * 1000);
      const rolesUpdatedAt = user?.roles_updated_at;

      if (rolesUpdatedAt && rolesUpdatedAt > tokenIssuedAt) {
        // 토큰이 오래되었음 → 세션 무효화하고 재로그인 유도
        console.log('[Session] Stale token detected, forcing re-authentication');
        return { ...session, error: 'RefreshRequired' };
      }
    } catch (error) {
      console.error('[Session] Freshness check failed:', error);
      // 실패해도 계속 진행 (기존 동작 유지)
    }
  }

  return session;
}
```

**프론트엔드 처리**:
```typescript
// 클라이언트에서
const session = await getSession();
if (session?.error === 'RefreshRequired') {
  // 재로그인 유도
  signOut({ callbackUrl: '/auth/signin?reason=token_expired' });
}
```

**주의사항**:
- 매 요청마다 DB 조회 추가됨 (성능 영향)
- 역할 변경 빈도가 낮다면 불필요
- **권장**: 역할 변경이 잦은 경우만 적용

---

### 2.3 폴백 정책 & Circuit Breaker

**목적**: Redis/MongoDB 장애 시 cascading failure 방지

**구현**:
```typescript
// src/lib/utils/circuit-breaker.ts (신규 생성)
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold = 5,        // 연속 실패 5회
    private timeout = 60000,      // 1분 후 HALF_OPEN
    private resetTime = 300000    // 5분 후 리셋
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      console.error('[CircuitBreaker] OPEN - too many failures');
    }
  }
}

// 사용 예
const dbCircuitBreaker = new CircuitBreaker();

async function getUserPermissions(userId: string) {
  try {
    return await dbCircuitBreaker.execute(() =>
      loadEffectivePermissions(userId)
    );
  } catch (error) {
    if (error.message === 'Circuit breaker is OPEN') {
      // DB 과부하 시 기본 권한 반환 (최소 권한 원칙)
      return new Set<string>(['user:basic:read']);
    }
    throw error;
  }
}
```

**적용 여부**: 대규모 트래픽 시에만 필요 (현재는 선택사항)

---

## 💡 Phase 3: 모니터링 & 알람 (2주일 내)

### 3.1 핵심 메트릭 수집

**구현할 메트릭**:
```typescript
// src/lib/monitoring/metrics.ts (신규 생성)
interface RBACMetrics {
  // 캐시 관련
  cache_hit_count: number;
  cache_miss_count: number;
  cache_hit_rate: number;  // hit / (hit + miss)

  // 복구 관련
  session_recovery_count: number;
  session_recovery_success: number;
  session_recovery_failure: number;
  session_recovery_db_latency_ms: number[];  // p50, p95, p99

  // 무효화 관련
  cache_invalidation_count: number;
  cache_invalidation_failure: number;

  // 락 관련
  lock_acquire_success: number;
  lock_acquire_failure: number;
}

class MetricsCollector {
  private metrics: RBACMetrics = { ... };

  recordCacheHit() { this.metrics.cache_hit_count++; }
  recordCacheMiss() { this.metrics.cache_miss_count++; }
  recordRecoveryLatency(ms: number) {
    this.metrics.session_recovery_db_latency_ms.push(ms);
  }

  getMetrics(): RBACMetrics {
    return {
      ...this.metrics,
      cache_hit_rate: this.metrics.cache_hit_count /
        (this.metrics.cache_hit_count + this.metrics.cache_miss_count) || 0
    };
  }

  // 주기적으로 Vercel Analytics, Datadog, CloudWatch 등에 전송
  async flush() {
    const metrics = this.getMetrics();
    // TODO: 외부 모니터링 서비스로 전송
    console.log('[Metrics]', JSON.stringify(metrics));
    this.reset();
  }
}

export const rbacMetrics = new MetricsCollector();
```

**적용 위치**:
- `authOptions.ts` 세션 콜백
- `permissions.ts` 권한 조회 로직
- `cache-invalidation.ts` 무효화 로직

---

### 3.2 알람 임계값 설정

**권장 알람**:
```yaml
alerts:
  - name: RBAC Cache Hit Rate Low
    condition: cache_hit_rate < 0.80
    duration: 5m
    severity: warning
    message: "RBAC 캐시 히트율이 80% 미만입니다. Redis 확인 필요."

  - name: Session Recovery Latency High
    condition: p95(session_recovery_db_latency_ms) > 200
    duration: 5m
    severity: warning
    message: "세션 복구 DB 지연이 200ms 초과. MongoDB 성능 확인."

  - name: Cache Invalidation Failure
    condition: cache_invalidation_failure_rate > 0.01
    duration: 1m
    severity: critical
    message: "캐시 무효화 실패율 1% 초과. Redis 장애 의심."

  - name: Session Recovery Failure Rate High
    condition: session_recovery_failure / session_recovery_count > 0.005
    duration: 5m
    severity: critical
    message: "세션 복구 실패율 0.5% 초과. DB 연결 확인."
```

**구현 방법**:
- Vercel Analytics → Datadog/CloudWatch 연동
- 또는 자체 `/api/metrics` 엔드포인트 → Prometheus Exporter

---

## 🔧 구현 순서 (추천)

### Week 1: 필수 보완
- [ ] Day 1-2: 캐시 무효화 헬퍼 함수 작성 (`cache-invalidation.ts`)
- [ ] Day 3: 로그 마스킹 유틸 추가 (`utils/logger.ts`)
- [ ] Day 4: TTL 조정 (1시간 → 5분) 및 테스트
- [ ] Day 5: 통합 테스트 및 프로덕션 배포

### Week 2: 권장 보완
- [ ] Day 1-2: 세션 신선도 검증 추가 (선택)
- [ ] Day 3-4: Circuit Breaker 구현 (선택, 대규모 시에만)
- [ ] Day 5: 성능 테스트 및 튜닝

### Week 3: 모니터링
- [ ] Day 1-3: 메트릭 수집 로직 구현
- [ ] Day 4: 알람 설정 (Vercel/Datadog)
- [ ] Day 5: 대시보드 구성 및 문서화

---

## ✅ 배포 후 검증 체크리스트

### 1. 기능 검증
- [ ] 역할 변경 시 캐시 즉시 무효화 확인
- [ ] 캐시 히트/미스 로그 확인
- [ ] 락 동작 확인 (동시 요청 시)
- [ ] 로그에 민감정보 노출 없는지 확인

### 2. 성능 검증
- [ ] 캐시 히트율 > 80% 확인
- [ ] DB 조회 빈도 감소 확인 (1시간당 사용자당 1회)
- [ ] API 응답 시간 < 100ms 확인

### 3. 장애 시나리오
- [ ] Redis 다운 시 DB 폴백 동작 확인
- [ ] MongoDB 지연 시 타임아웃 동작 확인
- [ ] 동시 100 요청 시 스탬피드 방지 확인

### 4. 보안 검증
- [ ] 프로덕션 로그에 이메일 전체 노출 없는지 확인
- [ ] 역할 회수 후 즉시 권한 거부되는지 확인
- [ ] 오래된 JWT 처리 확인 (신선도 검증 적용 시)

---

## 📊 예상 효과

| 항목 | 현재 | 개선 후 | 개선율 |
|------|------|---------|--------|
| **역할 변경 반영 시간** | 최대 1시간 | 즉시 | 100% ↑ |
| **캐시 TTL** | 1시간 | 5분 | 보안성 ↑ |
| **DB 부하** | 높음 | 낮음 | 96% ↓ |
| **모니터링** | 없음 | 실시간 메트릭 | 운영 안정성 ↑ |
| **장애 복구** | 수동 | Circuit Breaker | 자동화 |

---

## 🚨 리스크 & 대응책

### Risk 1: 캐시 무효화 실패
**영향**: 역할 변경이 반영되지 않음
**대응**:
- Redis 장애 시에도 동작하도록 try-catch
- 실패 시 알람 발송
- 수동 무효화 스크립트 준비

### Risk 2: TTL 단축으로 인한 DB 부하 증가
**영향**: MongoDB QPS 증가
**대응**:
- 점진적 TTL 조정 (1시간 → 30분 → 5분)
- 모니터링으로 DB 부하 관찰
- 필요시 TTL 재조정

### Risk 3: 세션 신선도 검증으로 인한 성능 저하
**영향**: 매 요청마다 DB 조회 추가
**대응**:
- 선택적 적용 (관리자만)
- 또는 캐시 적용 (roles_updated_at 캐싱)
- 필요성 낮으면 Phase 2에서 제외

---

## 📝 결론

### 즉시 적용 (필수)
1. ✅ 캐시 무효화 헬퍼 함수 준비
2. ✅ TTL 5분으로 조정
3. ✅ 로그 마스킹 강화

### 2주 내 적용 (권장)
4. ⚠️ 모니터링 메트릭 수집
5. ⚠️ 알람 설정

### 선택 사항
6. 💡 Circuit Breaker (대규모 트래픽 시)
7. 💡 세션 신선도 검증 (역할 변경 빈번 시)

**최종 권장**: Phase 1 (필수) 먼저 완료 → Phase 2, 3은 운영 상황에 따라 점진적 적용

---

**작성일**: 2025-10-16
**작성자**: Claude Code
**검토 필요**: 사용자 승인 후 구현 시작
