/**
 * RBAC 캐시 무효화 통합 테스트
 *
 * @purpose 배포 전 필수 검증 항목 자동화
 * @tests
 *   1. Smoke Test: 기본 동작 확인
 *   2. Lock Safety Test: UUID 기반 락 검증
 *   3. Cache Invalidation Test: 무효화 동작 확인
 *   4. Audit Log Test: 감사 로그 무결성
 */

import clientPromise from '../src/lib/mongodb-client';
import { redis, RedisKeys, RedisTTL } from '../src/lib/redis';
import { changeUserRole, invalidateUserPermissions } from '../src/lib/rbac/cache-invalidation';
import { getAuditLogs } from '../src/lib/rbac/audit-log';
import mongoose from 'mongoose';

// 테스트 결과 타입
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

/**
 * 테스트 실행 헬퍼
 */
async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    results.push({ name, passed: true, duration: Date.now() - start });
    console.log(`✅ ${name} - PASSED (${Date.now() - start}ms)`);
  } catch (error: any) {
    results.push({
      name,
      passed: false,
      error: error.message,
      duration: Date.now() - start,
    });
    console.error(`❌ ${name} - FAILED:`, error.message);
  }
}

/**
 * Test 1: Redis 연결 확인
 */
async function testRedisConnection(): Promise<void> {
  if (!redis) {
    throw new Error('Redis not configured');
  }

  const pong = await redis.ping();
  if (pong !== 'PONG') {
    throw new Error(`Redis PING failed: ${pong}`);
  }
}

/**
 * Test 2: UUID 락 생성 및 확인
 */
async function testUuidLock(): Promise<void> {
  if (!redis) throw new Error('Redis not configured');

  const lockKey = 'test:lock:uuid';
  const lockToken = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

  // 락 획득
  const acquired = await redis.set(lockKey, lockToken, { nx: true, ex: 5 });
  if (!acquired) {
    throw new Error('Failed to acquire lock');
  }

  // 락 값 확인 (UUID 형식)
  const storedToken = await redis.get(lockKey);
  if (storedToken !== lockToken) {
    throw new Error(`Lock token mismatch: expected ${lockToken}, got ${storedToken}`);
  }

  // Lua script로 조건부 DEL
  const luaScript = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;

  const deleted = await redis.eval(luaScript, 1, lockKey, lockToken);
  if (deleted !== 1) {
    throw new Error(`Lua script DEL failed: ${deleted}`);
  }

  // 락이 삭제되었는지 확인
  const afterDel = await redis.get(lockKey);
  if (afterDel !== null) {
    throw new Error(`Lock still exists after DEL: ${afterDel}`);
  }
}

/**
 * Test 3: 다른 프로세스의 락을 삭제할 수 없는지 확인
 */
async function testLockSafety(): Promise<void> {
  if (!redis) throw new Error('Redis not configured');

  const lockKey = 'test:lock:safety';
  const token1 = `token1-${Date.now()}`;
  const token2 = `token2-${Date.now()}`;

  // Process 1이 락 획득
  await redis.set(lockKey, token1, { nx: true, ex: 10 });

  // Process 2가 자신의 토큰으로 삭제 시도 (실패해야 함)
  const luaScript = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;

  const result = await redis.eval(luaScript, 1, lockKey, token2);
  if (result !== 0) {
    throw new Error('Lock deleted by another process! (Security violation)');
  }

  // Process 1이 자신의 토큰으로 삭제 (성공해야 함)
  const result2 = await redis.eval(luaScript, 1, lockKey, token1);
  if (result2 !== 1) {
    throw new Error('Owner failed to delete own lock');
  }
}

/**
 * Test 4: 캐시 무효화 기본 동작
 */
async function testCacheInvalidation(): Promise<void> {
  if (!redis) throw new Error('Redis not configured');

  const testUserId = new mongoose.Types.ObjectId().toString();
  const testEmail = 'test@example.com';

  // 1. 캐시 생성
  const permKey = RedisKeys.userPermissions(testUserId);
  const recoveredKey = RedisKeys.recoveredUserId(testEmail);

  await redis.set(permKey, JSON.stringify({ roles: ['user'] }), { ex: 60 });
  await redis.set(recoveredKey, testUserId, { ex: 60 });

  // 캐시 존재 확인
  const cached1 = await redis.get(permKey);
  const cached2 = await redis.get(recoveredKey);

  if (!cached1 || !cached2) {
    throw new Error('Cache not created');
  }

  // 2. 무효화 실행
  await invalidateUserPermissions(testUserId, testEmail);

  // 3. 캐시 삭제 확인
  const afterInvalidate1 = await redis.get(permKey);
  const afterInvalidate2 = await redis.get(recoveredKey);

  if (afterInvalidate1 !== null || afterInvalidate2 !== null) {
    throw new Error('Cache not invalidated');
  }
}

/**
 * Test 5: PUBLISH 메시지 발행 확인
 */
async function testPublishMessage(): Promise<void> {
  if (!redis) throw new Error('Redis not configured');

  const testUserId = new mongoose.Types.ObjectId().toString();
  const testEmail = 'test@example.com';

  // PUBLISH 실행 (실제로는 구독자가 없으므로 반환값만 확인)
  const result = await redis.publish(
    'rbac:invalidate',
    JSON.stringify({ userId: testUserId, email: testEmail })
  );

  // Upstash Redis REST API에서는 구독자 수를 반환하지 않을 수 있음
  console.log(`  PUBLISH result: ${result} subscribers`);
}

/**
 * Test 6: 역할 변경 및 Audit 로그 확인
 */
async function testRoleChangeWithAudit(): Promise<void> {
  const client = await clientPromise;
  const db = client.db('naraddon');

  // 테스트 사용자 생성
  const testUser = {
    _id: new mongoose.Types.ObjectId(),
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    createdAt: new Date(),
  };

  await db.collection('users').insertOne(testUser);

  try {
    // 테스트 역할 ID (기본 사용자 역할)
    const testRoleId = new mongoose.Types.ObjectId().toString();

    // 역할 변경 실행
    await changeUserRole(testUser._id.toString(), testRoleId, {
      changedBy: 'test-admin',
      reason: 'Integration test',
    });

    // Audit 로그 확인
    const logs = await getAuditLogs(testUser._id.toString(), 10);

    if (logs.length === 0) {
      throw new Error('Audit log not created');
    }

    const latestLog = logs[0];
    if (latestLog.action !== 'role_change') {
      throw new Error(`Wrong audit action: ${latestLog.action}`);
    }

    if (latestLog.targetEmail !== testUser.email) {
      throw new Error(`Wrong email in audit log: ${latestLog.targetEmail}`);
    }

    console.log(`  Audit log created: ${latestLog.action} at ${latestLog.timestamp}`);
  } finally {
    // 테스트 데이터 정리
    await db.collection('users').deleteOne({ _id: testUser._id });
    await db.collection('user_roles').deleteMany({ userId: testUser._id });
    await db.collection('audit_logs').deleteMany({ targetUserId: testUser._id });
  }
}

/**
 * Test 7: TTL 설정 확인
 */
async function testTTLSettings(): Promise<void> {
  // TTL이 5분(300초)인지 확인
  if (RedisTTL.userPermissions !== 300) {
    throw new Error(`Wrong TTL for userPermissions: ${RedisTTL.userPermissions}`);
  }

  if (RedisTTL.recoveredUserId !== 300) {
    throw new Error(`Wrong TTL for recoveredUserId: ${RedisTTL.recoveredUserId}`);
  }

  if (RedisTTL.recoveryLock !== 5) {
    throw new Error(`Wrong TTL for recoveryLock: ${RedisTTL.recoveryLock}`);
  }

  console.log('  TTL settings verified: userPermissions=300s, recoveredUserId=300s, lock=5s');
}

/**
 * 메인 테스트 실행
 */
async function main() {
  console.log('🧪 RBAC Cache Invalidation Integration Tests\n');
  console.log('=' .repeat(60));

  await runTest('1. Redis Connection', testRedisConnection);
  await runTest('2. UUID Lock Creation', testUuidLock);
  await runTest('3. Lock Safety (Cross-process)', testLockSafety);
  await runTest('4. Cache Invalidation', testCacheInvalidation);
  await runTest('5. PUBLISH Message', testPublishMessage);
  await runTest('6. Role Change + Audit', testRoleChangeWithAudit);
  await runTest('7. TTL Settings', testTTLSettings);

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`Total: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

// 실행
main().catch((error) => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});
