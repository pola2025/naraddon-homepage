# RBAC 캐시 무효화 시스템 배포 전 체크리스트

**작성일**: 2025-10-16
**버전**: Phase 1 (필수 항목)

---

## 🚨 즉시 확인할 8가지 필수 체크 (배포 전/직후)

### 1. ✅ 무효화 메시지(PUBLISH) 수신 확인

**목적**: 각 인스턴스에서 `rbac:invalidate` 구독 로그가 찍히는지 확인

**체크 방법**:
```bash
# Vercel 로그에서 PUBLISH 메시지 확인
npx vercel logs https://naraddon.com --follow | grep "rbac:invalidate"

# 또는
npx vercel logs https://naraddon.com 2>&1 | grep -A 3 "Cache invalidated"
```

**예상 출력**:
```
[RBAC] Cache invalidated { userId: '507f1f77...', email: 'u***@example.com' }
```

**주의사항**:
- ⚠️ **Upstash Redis REST API는 전통적인 SUBSCRIBE를 지원하지 않음**
- 현재 구현은 **TTL 기반 자동 만료 (5분)** 방식 사용
- PUBLISH는 로깅 및 추후 Redis Streams 전환을 위한 준비

**개선 방안** (Phase 2):
- Redis Streams (XADD/XREAD) 사용
- 또는 Vercel Edge Config + Webhook

---

### 2. ✅ 락 토큰(UUID) 검증

**목적**: 락 생성 값이 UUID이고, 락 해제 시 Lua가 GET + value compare + DEL을 수행하는지 확인

**체크 방법**:
```bash
# 프로덕션 배포 후
npm run test:cache-invalidation  # 로컬 테스트 (Redis 필요)

# 또는 수동 확인
curl -X POST https://naraddon.com/api/test-lock-safety
```

**검증 항목**:
- [ ] 락 토큰이 UUID 형식 (`${timestamp}-${random}`)
- [ ] Lua 스크립트가 `GET → Compare → DEL` 수행
- [ ] 다른 프로세스의 락을 삭제할 수 없음
- [ ] 락 TTL이 5초로 설정됨

**코드 위치**: `src/lib/auth/authOptions.ts:143-191`

---

### 3. ✅ 락 만료(ex)가 적절하고 극단적 지연에도 락이 풀리는지 확인

**목적**: 데드락 방지

**체크 방법**:
```bash
# Redis에서 락 확인
# Upstash Console → Data Browser
# 키: session:userid:*:lock
# TTL: 5초 이내

# 또는 CLI
redis-cli TTL "session:userid:test@example.com:lock"
```

**검증 항목**:
- [ ] 락 TTL이 5초
- [ ] DB 트랜잭션 실패 시에도 락 해제됨
- [ ] 장시간(>5초) DB 쿼리 시에도 시스템 정상 동작

---

### 4. ✅ recoveredUserId 무효화

**목적**: 역할 변경 시 `session:userid:email:<email>` 키도 삭제되는지 확인

**체크 방법**:
```typescript
// 테스트 스크립트
import { changeUserRole } from '@/lib/rbac/cache-invalidation';
import { redis, RedisKeys } from '@/lib/redis';

// 1. 역할 변경
await changeUserRole(userId, newRoleId, { reason: 'Test' });

// 2. 캐시 확인
const cached = await redis.get(RedisKeys.recoveredUserId(email));
console.log('recoveredUserId cache:', cached); // null이어야 함
```

**검증 항목**:
- [ ] `rbac:perms:${userId}` 삭제됨
- [ ] `session:userid:${email}` 삭제됨
- [ ] PUBLISH 메시지에 userId + email 포함

**코드 위치**: `src/lib/rbac/cache-invalidation.ts:20-54`

---

### 5. ✅ Audit 로그 무결성

**목적**: role change 트랜잭션에서 audit 로그가 항상 남는지 확인

**체크 방법**:
```bash
# MongoDB Atlas → audit_logs 컬렉션 확인
db.audit_logs.find({ action: 'role_change' }).sort({ timestamp: -1 }).limit(10)

# 또는 API
curl https://naraddon.com/api/audit-logs?userId=<userId>
```

**검증 항목**:
- [ ] 트랜잭션 내에서 audit 로그 기록됨
- [ ] 로그에 WHO, WHAT, WHEN, WHY 모두 포함
- [ ] 이메일이 **마스킹되지 않고** 원본 저장 (DB는 암호화됨)
- [ ] 트랜잭션 실패 시 audit 로그도 롤백됨

**주의사항**:
- ⚠️ Audit 로그는 **DB에는 원본 저장**, **앱 로그에는 마스킹**
- 로그 수집 시스템(Vercel Logs)에는 마스킹된 데이터만 전송

**코드 위치**: `src/lib/rbac/audit-log.ts`

---

### 6. ✅ TTL 변경 영향 관찰

**목적**: TTL 5분 적용 후 24시간 모니터링

**체크 방법**:
```bash
# 캐시 히트율 확인
npm run benchmark:rbac

# DB 쿼리 RPS 확인 (MongoDB Atlas)
# Performance → Query Performance

# Vercel 로그에서 DB 쿼리 빈도 확인
npx vercel logs https://naraddon.com --since 24h | grep "Recovered userId from DB" | wc -l
```

**모니터링 지표**:
| 지표 | 목표 | 알람 조건 |
|------|------|-----------|
| 캐시 히트율 | > 80% | < 80% (5분) |
| DB 쿼리 p95 latency | < 200ms | > 200ms |
| permission query RPS | < 100 req/s | > 100 req/s |

**배포 후 24시간 모니터링 필수**

---

### 7. ⚠️ Pub/Sub 요금/한도 및 재연결 처리

**목적**: Upstash Redis Pub/Sub 한도 확인

**체크 방법**:
```bash
# Upstash Console → Usage
# PUBLISH 요금: 무료 플랜 기준 10,000 requests/day

# 예상 사용량
# 역할 변경: 하루 10회 → 10 PUBLISH
# → 무료 플랜으로 충분
```

**주의사항**:
- ⚠️ Upstash REST API는 long-lived connection 없음 (재연결 불필요)
- PUBLISH는 fire-and-forget 방식
- 실제 동기화는 **TTL 자동 만료**로 해결

---

### 8. ✅ 에러/예외 경로

**목적**: Redis DEL 실패 시 재시도 및 알람 확인

**체크 방법**:
```bash
# Redis 장애 시뮬레이션 (개발 환경)
# .env.local에서 REDIS_URL 제거 후 테스트

npm run dev
# 역할 변경 시도
# 예상: Redis 없이도 정상 동작 (Graceful Degradation)
```

**검증 항목**:
- [ ] Redis DEL 실패 시 에러 로그 출력
- [ ] 실패해도 트랜잭션은 계속 진행
- [ ] DB 트랜잭션 실패 시 롤백 확인
- [ ] 알람 발생 (선택, Phase 2)

**에러 처리 코드**:
```typescript
try {
  await redis.del(...keys);
} catch (error) {
  logError('Cache invalidation failed', error, { userId, email });
  // 실패해도 계속 진행 (다음 조회 시 DB에서 최신 정보 로드)
}
```

---

## 🛡️ 보안·PII 체크

### 로그 마스킹 확인

**체크 방법**:
```bash
# Vercel 로그에서 PII 노출 확인
npx vercel logs https://naraddon.com --since 1h > /tmp/logs.txt

# 이메일 원본 검색 (있으면 안 됨)
grep -E "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" /tmp/logs.txt

# ObjectId 전체 노출 검색 (24자리 hex, 있으면 안 됨)
grep -E "[0-9a-f]{24}" /tmp/logs.txt
```

**예상 출력** (마스킹됨):
```
[RBAC] Cache invalidated { userId: '507f1f77...', email: 'u***@example.com' }
[RBAC] Role changed successfully { userId: '507f1f77...', email: 'u***@example.com' }
```

**주의사항**:
- ✅ **앱 로그**: 마스킹됨 (`logSafe()` 사용)
- ✅ **DB (audit_logs)**: 원본 저장 (암호화 전송)
- ⚠️ **절대 로그하지 않음**: password, secret, token

**코드 위치**: `src/lib/utils/logger.ts`

---

## 📊 권장 모니터링 지표 & 알람

### Immediate (Critical) - Pager 발생

| 지표 | 임계값 | 조치 |
|------|---------|------|
| `cache_invalidation_failure_rate` | > 0.01 (1%) | Redis 상태 확인, 수동 캐시 삭제 |
| `rbac:invalidate not received` | >50% instances, 10s | TTL 의존 확인, Redis Streams 고려 |
| `db permission query p95` | > 200ms | DB 인덱스 확인, 쿼리 최적화 |

### Important (Warn) - Slack 알림

| 지표 | 임계값 | 조치 |
|------|---------|------|
| `cache_hit_rate` | < 80% (5분) | TTL 조정, 캐시 워밍 |
| `lock_acquire_fail_rate` | > 2% (1분) | 락 TTL 조정, DB 트랜잭션 최적화 |
| `session_recovery_failure_rate` | > 0.5% (5분) | MongoDB 연결 확인 |

### Nice-to-have - 대시보드

- `audit_log_write_failure_rate`
- `long_lived_locks_count` (locks older than ex window)
- `cache_invalidation_latency_p95`

---

## 🧪 권장 테스트 목록

### Smoke Tests (배포 직후)

```bash
# 1. 역할 변경 → 캐시 삭제 → API 호출 시 반영 확인
npm run test:cache-invalidation

# 2. Redis 장애 시뮬레이션
# .env.local에서 REDIS_URL 제거
npm run dev
# → 권한 체크가 여전히 DB 폴백으로 동작하는지 확인
```

### Stomp Test (스탬피드 시나리오)

```bash
# 만료 시점에 동시 200~500 요청
# → DB 쿼리는 1개(락 보유자)인지 확인

# Artillery 또는 k6 사용
artillery quick --count 500 --num 1 https://naraddon.com/api/debug-session
```

### Multi-instance Sync (선택)

**주의**: 현재 구현은 TTL 기반이므로 최대 5분 지연 허용

```bash
# 5 인스턴스로 역할 변경 후
# 모든 인스턴스에서 캐시가 지워지는지 평균 지연 측정

# 목표: < 5분 (TTL 기반)
# Phase 2 (Redis Streams): < 1초
```

### Security Regression

```bash
# 로그 수집 환경에서 PII 노출 여부 스캔
npx vercel logs https://naraddon.com --since 24h | grep -E "[a-zA-Z0-9._%+-]+@"

# 결과: 매칭 없어야 함 (마스킹됨)
```

---

## 🔧 소소하지만 중요한 구현·운영 팁

### 1. Lock Release 안전성
```typescript
// ✅ 올바른 방법 - Lua script
const luaScript = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  else
    return 0
  end
`;
await redis.eval(luaScript, 1, lockKey, lockToken);

// ❌ 절대 금지 - 다른 프로세스의 락 삭제 가능
await redis.del(lockKey);
```

### 2. Pub/Sub Message Size
```typescript
// ✅ 작게 유지 (userId만)
await redis.publish('rbac:invalidate', JSON.stringify({ userId, email }));

// ❌ 큰 메시지는 피함
await redis.publish('rbac:invalidate', JSON.stringify({ ...user, ...roles, ...permissions }));
```

### 3. Idempotency
```typescript
// ✅ 여러 번 호출되어도 안전
await invalidateUserPermissions(userId, email);
await invalidateUserPermissions(userId, email); // OK
```

### 4. Backpressure
```typescript
// ⚠️ 역할 변경 급증 시 Redis API 한도 초과 가능
// → Batch or Throttle 필요 (Phase 2)

// 예: 1000명 역할 일괄 변경
await bulkInvalidateCache(userIds); // 한 번에 처리
```

### 5. Reconcile Job
```bash
# 주기적 스캔으로 DB vs cache 불일치 자동 검사 (선택)
npm run reconcile:cache  # 매일 1회 실행
```

### 6. Key Naming 컨벤션
```typescript
rbac:perms:<userId>
rbac:recovered_userid:email:<email>
rbac:lock:<email>
```

---

## 📖 Runbook (비상시 빠른 대처)

### 증상: 권한 변경이 반영되지 않음

**확인**:
```bash
# 1. Redis 캐시 확인
redis-cli GET "rbac:perms:<userId>"

# 2. PUBLISH 로그 확인
npx vercel logs https://naraddon.com | grep "Cache invalidated"

# 3. Audit 로그 확인
db.audit_logs.find({ targetUserId: ObjectId("...") })
```

**수동 무효화**:
```bash
redis-cli DEL "rbac:perms:<userId>"
redis-cli DEL "session:userid:<email>"
```

**If Redis failing**:
```bash
# 1. Upstash Console 확인
# 2. DB based policy enforcement (fallback) 확인
# 3. 알람 발생 확인
```

### 증상: 락이 풀리지 않음 (lock stuck)

**확인**:
```bash
# 락 확인
redis-cli GET "session:userid:*:lock"

# 락 값 확인 (UUID여야 함)
redis-cli GET "session:userid:<email>:lock"
```

**수동 해제** (주의: multi-instance race 우려):
```bash
redis-cli DEL "session:userid:<email>:lock"
```

**재발 시**:
- 락 만료시간 조정 (5초 → 10초)
- 긴 DB 트랜잭션 원인 분석

---

## ✅ 최종 배포 체크리스트

### 배포 전
- [ ] 모든 코드 변경사항 커밋됨
- [ ] `npm run lint` 통과
- [ ] `npm run type-check` 통과
- [ ] PII 마스킹 코드 적용 확인
- [ ] Audit 로그 시스템 구현 확인
- [ ] TTL 5분으로 설정 확인

### 배포 직후 (15분 내)
- [ ] Redis 연결 정상 (Upstash Console)
- [ ] Vercel 로그에 에러 없음
- [ ] 테스트 역할 변경 수행
- [ ] 캐시 무효화 로그 확인
- [ ] PII 마스킹 적용 확인

### 배포 후 24시간
- [ ] 캐시 히트율 모니터링 (>80%)
- [ ] DB 쿼리 p95 latency (<200ms)
- [ ] 권한 거부 에러 없음
- [ ] Audit 로그 정상 기록

### 배포 후 1주일
- [ ] 성능 지표 안정화
- [ ] 사용자 피드백 수집
- [ ] TTL 조정 필요 여부 검토

---

**작성자**: Claude (AI Assistant)
**마지막 업데이트**: 2025-10-16
**다음 단계**: Phase 2 (Session Freshness + Circuit Breaker)
