# RBAC 시스템 최적화 검토 및 적용 계획

## 현재 시스템 상태

### 트래픽 규모
- **현재 사용자**: 10명 (4 admin, 1 examiner, 5 user)
- **예상 트래픽**: ~100 요청/일
- **Upstash Free tier**: 10,000 commands/day → **충분**
- **MongoDB Atlas Free tier**: 512MB storage, 100 concurrent connections → **충분**

### 성능 현황
- **캐시 HIT**: 15ms ⚡
- **캐시 MISS**: 450ms 🐌 (첫 요청 또는 TTL 만료)
- **캐시 TTL**: 60초

---

## 제안된 최적화 항목 검토

### 1. 캐시 스탬피드 보호 (Cache Stampede Protection)

#### 문제
TTL 만료 시 동시 요청들이 모두 DB 조회 → DB 과부하

#### 현재 상태
- ❌ **미구현**
- 트래픽이 낮아 현재는 문제 없음 (10명 × 평균 10 요청/일)

#### 적용 여부: **Phase 2 (사용자 100명 이상)**

**이유:**
- 현재 동시 접속자 < 5명
- 캐시 만료 동시 타격 확률 극히 낮음
- 조기 최적화(premature optimization) 방지

**적용 시점:**
```
사용자 100명 돌파 OR
캐시 MISS 동시 발생 > 10회/분
```

**구현 예시 (미래):**
```typescript
// src/lib/rbac/cache-lock.ts
import { redis } from '@/lib/redis';

export async function withCacheLock<T>(
  key: string,
  fn: () => Promise<T>,
  options: { lockTTL?: number; retryDelay?: number } = {}
): Promise<T> {
  const lockKey = `${key}:lock`;
  const lockTTL = options.lockTTL || 5;
  const retryDelay = options.retryDelay || 50;

  // 1. 캐시 확인
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  // 2. 락 획득 시도
  const lockAcquired = await redis.set(lockKey, '1', {
    nx: true,
    ex: lockTTL,
  });

  if (!lockAcquired) {
    // 3. 다른 프로세스가 채우는 중 - 대기 후 재시도
    await new Promise(resolve => setTimeout(resolve, retryDelay));
    return withCacheLock(key, fn, options);
  }

  try {
    // 4. DB 조회 및 캐시 저장
    const result = await fn();
    return result;
  } finally {
    // 5. 락 해제
    await redis.del(lockKey);
  }
}

// 사용 예시
const permissions = await withCacheLock(
  RedisKeys.userPermissions(userId),
  async () => {
    const perms = await loadFromDB(userId);
    await redis.set(
      RedisKeys.userPermissions(userId),
      JSON.stringify([...perms]),
      { ex: 60 }
    );
    return perms;
  }
);
```

---

### 2. DB 쿼리 최적화 / 권한 비정규화

#### 문제
450ms 조회 시간 - 여러 컬렉션 조인 필요

#### 현재 쿼리 구조
```typescript
// 1. user_roles 조회 (userId)
const userRoles = await UserRole.find({ userId });

// 2. 역할 상속 재귀 조회 (roles)
for (roleId in userRoles) {
  await collectInheritedRoles(roleId); // 재귀
}

// 3. role_permissions 조회 (각 역할마다)
for (roleId in allRoles) {
  await RolePermission.find({ roleId }); // N+1 문제
}

// 4. permissions 조회 (각 permissionId마다)
for (permissionId in rolePerms) {
  await Permission.findById(permissionId); // N+1 문제
}
```

#### 적용 여부: **Phase 1 (즉시 적용)**

**이유:**
- 450ms는 사용자 경험에 영향
- 캐시 MISS 시 체감 지연
- 비교적 간단한 최적화로 큰 효과

#### ✅ 즉시 적용: 인덱스 최적화

```javascript
// MongoDB 인덱스 생성
db.user_roles.createIndex({ userId: 1, roleId: 1 }, { unique: true });
db.role_permissions.createIndex({ roleId: 1, permissionId: 1 });
db.permissions.createIndex({ code: 1 }, { unique: true });
db.roles.createIndex({ name: 1 }, { unique: true });
```

**예상 효과: 450ms → 200-250ms**

#### 🔄 Phase 1.5: 쿼리 최적화 (Aggregation Pipeline)

```typescript
// 개선: 한 번의 aggregation으로 모든 권한 로드
async function loadPermissionsOptimized(userId: string) {
  const result = await UserRole.aggregate([
    // 1. 사용자 역할 필터
    { $match: { userId: new Types.ObjectId(userId) } },

    // 2. roles 조인
    {
      $lookup: {
        from: 'roles',
        localField: 'roleId',
        foreignField: '_id',
        as: 'role',
      },
    },
    { $unwind: '$role' },

    // 3. role_permissions 조인
    {
      $lookup: {
        from: 'role_permissions',
        localField: 'role._id',
        foreignField: 'roleId',
        as: 'rolePerms',
      },
    },
    { $unwind: '$rolePerms' },

    // 4. permissions 조인
    {
      $lookup: {
        from: 'permissions',
        localField: 'rolePerms.permissionId',
        foreignField: '_id',
        as: 'permission',
      },
    },
    { $unwind: '$permission' },

    // 5. 권한 코드만 추출
    { $group: { _id: null, codes: { $addToSet: '$permission.code' } } },
  ]);

  return new Set(result[0]?.codes || []);
}
```

**예상 효과: 450ms → 50-100ms**

#### 🚀 Phase 2: 권한 비정규화 (Materialized Permissions)

```javascript
// 새 컬렉션: user_effective_permissions
{
  _id: ObjectId,
  userId: ObjectId,
  permissions: ["policy:analysis:read", "policy:analysis:write", ...],
  rolesUpdatedAt: ISODate,
  updatedAt: ISODate
}

// 역할 변경 시 업데이트 트리거
async function updateUserRole(userId, newRoleId) {
  // 1. user_roles 업데이트
  await UserRole.findOneAndUpdate(...);

  // 2. 권한 재계산
  const perms = await loadPermissionsOptimized(userId);

  // 3. materialized collection 업데이트
  await UserEffectivePermissions.findOneAndUpdate(
    { userId },
    {
      userId,
      permissions: [...perms],
      rolesUpdatedAt: new Date(),
      updatedAt: new Date(),
    },
    { upsert: true }
  );

  // 4. Redis 캐시 무효화
  await invalidateUserPermissions(userId);
}
```

**예상 효과: 450ms → 10-20ms (단순 배열 조회)**

---

### 3. 캐시 무효화 원자성

#### 현재 상태
```typescript
// src/lib/rbac/permissions.ts
export async function invalidateUserPermissions(userId: string) {
  if (!redis) return;
  await redis.del(RedisKeys.userPermissions(userId));
}
```

#### 문제
- 역할 변경 API에서 명시적 호출 필요
- DB 업데이트와 캐시 무효화 사이 타이밍 이슈

#### 적용 여부: **Phase 1 (즉시 적용)**

#### ✅ 개선: rolesUpdatedAt 필드 추가

```typescript
// src/models/User.ts (또는 별도 컬렉션)
interface UserMetadata {
  userId: ObjectId;
  rolesUpdatedAt: Date; // 역할 마지막 변경 시각
}

// 역할 변경 시
async function updateUserRoleSafe(userId: string, newRoleId: string) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. user_roles 업데이트
    await UserRole.findOneAndUpdate(
      { userId },
      { roleId: newRoleId },
      { session, upsert: true }
    );

    // 2. rolesUpdatedAt 갱신
    await UserMetadata.findOneAndUpdate(
      { userId },
      { userId, rolesUpdatedAt: new Date() },
      { session, upsert: true }
    );

    await session.commitTransaction();

    // 3. 캐시 무효화 (트랜잭션 외부)
    await invalidateUserPermissions(userId);

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

#### 🔄 Phase 1.5: 토큰 신선도 검사

```typescript
// src/lib/auth/guards.ts
export async function requireLogin(): Promise<AuthUser> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error('UNAUTHORIZED');
  }

  // 토큰 신선도 확인 (optional)
  const tokenIat = session.user.iat; // NextAuth에 추가 필요
  const metadata = await UserMetadata.findOne({ userId: session.user.id });

  if (metadata && tokenIat < metadata.rolesUpdatedAt.getTime() / 1000) {
    throw new Error('STALE_TOKEN'); // 401 + 재로그인 요청
  }

  return {
    id: session.user.id,
    email: session.user.email!,
    name: session.user.name || null,
    role: session.user.role || 'user',
  };
}
```

---

### 4. 장애 폴백 정책

#### 현재 상태
```typescript
// src/lib/redis.ts
if (!REDIS_URL || !REDIS_TOKEN) {
  console.warn('[Redis] Redis 환경변수 미설정 - 캐시 없이 동작');
  redis = null; // Graceful degradation
}
```

✅ **이미 구현됨** - Redis 없어도 DB로 폴백

#### 추가 개선: Circuit Breaker

#### 적용 여부: **Phase 2 (사용자 100명 이상)**

```typescript
// src/lib/redis-circuit-breaker.ts
class RedisCircuitBreaker {
  private failureCount = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  private threshold = 5; // 연속 5회 실패
  private timeout = 60000; // 60초 후 재시도

  async execute<T>(fn: () => Promise<T>): Promise<T | null> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        console.warn('[Redis] Circuit breaker OPEN - skipping');
        return null; // Fallback to DB
      }
    }

    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure() {
    this.failureCount++;
    this.lastFailTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      console.error('[Redis] Circuit breaker OPENED');
    }
  }

  private reset() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
}
```

---

### 5. 모니터링 및 알람

#### 현재 상태
- ❌ **미구현**
- 기본 콘솔 로그만 존재

#### 적용 여부: **Phase 1 (즉시 적용 - 간단한 버전)**

#### ✅ 즉시 적용: 로그 집계

```typescript
// src/lib/rbac/monitoring.ts
interface RBACMetrics {
  cacheHit: number;
  cacheMiss: number;
  dbQueryTime: number[];
  permissionDenied: number;
  invalidations: number;
}

export const rbacMetrics: RBACMetrics = {
  cacheHit: 0,
  cacheMiss: 0,
  dbQueryTime: [],
  permissionDenied: 0,
  invalidations: 0,
};

// loadEffectivePermissions에서 호출
export async function loadEffectivePermissions(userId: string) {
  const start = Date.now();

  if (redis) {
    const cached = await redis.get(RedisKeys.userPermissions(userId));
    if (cached) {
      rbacMetrics.cacheHit++;
      console.log(`[RBAC] Cache HIT - userId: ${userId}`);
      return new Set(JSON.parse(cached));
    }
  }

  rbacMetrics.cacheMiss++;
  const dbStart = Date.now();

  // DB 조회...
  const permissions = await loadFromDB(userId);

  const dbTime = Date.now() - dbStart;
  rbacMetrics.dbQueryTime.push(dbTime);
  console.log(`[RBAC] Cache MISS - DB query took ${dbTime}ms`);

  return permissions;
}

// 통계 엔드포인트 (admin only)
// GET /api/admin/rbac-stats
export function getRBACStats() {
  const totalRequests = rbacMetrics.cacheHit + rbacMetrics.cacheMiss;
  const hitRate = totalRequests > 0
    ? (rbacMetrics.cacheHit / totalRequests * 100).toFixed(2)
    : 0;

  const avgDbTime = rbacMetrics.dbQueryTime.length > 0
    ? (rbacMetrics.dbQueryTime.reduce((a, b) => a + b, 0) / rbacMetrics.dbQueryTime.length).toFixed(2)
    : 0;

  return {
    cacheHitRate: `${hitRate}%`,
    totalRequests,
    cacheHit: rbacMetrics.cacheHit,
    cacheMiss: rbacMetrics.cacheMiss,
    avgDbQueryTime: `${avgDbTime}ms`,
    permissionDenied: rbacMetrics.permissionDenied,
    invalidations: rbacMetrics.invalidations,
  };
}
```

#### 🚀 Phase 2: Sentry/DataDog 연동

```typescript
import * as Sentry from '@sentry/nextjs';

// 느린 쿼리 감지
if (dbTime > 200) {
  Sentry.captureMessage('RBAC DB query slow', {
    level: 'warning',
    extra: { userId, dbTime },
  });
}

// 캐시 히트율 낮음
if (hitRate < 80 && totalRequests > 100) {
  Sentry.captureMessage('RBAC cache hit rate low', {
    level: 'warning',
    extra: { hitRate, totalRequests },
  });
}
```

---

## 적용 로드맵

### ✅ Phase 1 (즉시 적용 - 이번 배포)

**목표: 기본 최적화 + 모니터링**

1. **MongoDB 인덱스 추가**
   ```bash
   npm run create-rbac-indexes
   ```

2. **간단한 메트릭 수집**
   - rbacMetrics 객체 추가
   - 캐시 HIT/MISS 카운팅
   - DB 쿼리 시간 측정

3. **rolesUpdatedAt 필드 추가**
   - UserMetadata 컬렉션 생성
   - 역할 변경 시 갱신

4. **통계 엔드포인트**
   - GET /api/admin/rbac-stats
   - Admin only

**예상 효과:**
- 450ms → 200-250ms (인덱스)
- 캐시 히트율 가시화
- 역할 변경 무효화 개선

---

### 🔄 Phase 1.5 (사용자 50명 도달 시)

**목표: 쿼리 최적화**

1. **Aggregation Pipeline 적용**
   - loadPermissionsOptimized 함수
   - N+1 쿼리 제거

2. **토큰 신선도 검사 (optional)**
   - iat vs rolesUpdatedAt 비교
   - STALE_TOKEN 에러 처리

**예상 효과:**
- 200-250ms → 50-100ms
- 역할 변경 즉시 반영 강제

---

### 🚀 Phase 2 (사용자 100명 이상)

**목표: 고급 최적화 + 장애 대응**

1. **캐시 스탬피드 보호**
   - withCacheLock 함수
   - Redis mutex 패턴

2. **권한 비정규화**
   - user_effective_permissions 컬렉션
   - 10-20ms 조회

3. **Circuit Breaker**
   - Redis 장애 감지
   - Graceful degradation

4. **고급 모니터링**
   - Sentry/DataDog 연동
   - 알람 설정

**예상 효과:**
- 50-100ms → 10-20ms (비정규화)
- DB 부하 90% 감소
- 장애 복원력 강화

---

## 비용 분석

### 현재 (10명)
- Upstash: Free tier ($0)
- MongoDB: Free tier ($0)
- **총: $0/월**

### Phase 2 (100명)
- Upstash: ~1,000 commands/day → Free tier ($0)
- MongoDB: ~10,000 queries/day → Free tier ($0)
- **총: $0/월**

### 스케일업 (1,000명)
- Upstash: ~10,000 commands/day → Free tier or $10/월
- MongoDB: ~100,000 queries/day → $25-50/월
- **총: $35-60/월**

---

## 결론 및 권장사항

### ✅ 즉시 적용 (Phase 1)
1. MongoDB 인덱스 생성
2. 메트릭 수집 (rbacMetrics)
3. rolesUpdatedAt 필드
4. 통계 API

**예상 소요 시간: 2-3시간**
**예상 효과: 450ms → 200-250ms (44% 개선)**

### 🔄 조건부 적용 (Phase 1.5 ~ 2)
- 사용자 50명: Aggregation Pipeline
- 사용자 100명: 캐시 스탬피드 + 비정규화
- 장애 발생 시: Circuit Breaker

### ❌ 현재 불필요
- 캐시 스탬피드 보호 (동시 접속 < 5)
- 권한 비정규화 (캐시로 충분)
- Circuit Breaker (장애 이력 없음)

**철학: "Premature optimization is the root of all evil"**

현재는 **간단하고 안정적인 시스템**을 유지하고,
**실제 문제가 발생할 때** 단계적으로 최적화하는 것이 최선입니다.
