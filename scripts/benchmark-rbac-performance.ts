/**
 * RBAC 성능 벤치마크 스크립트
 *
 * @purpose Aggregation Pipeline vs Legacy 성능 비교
 * @usage npm run benchmark:rbac
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';

// ⚠️ 중요: loadEffectivePermissions 내부에서 connectDB() 호출하므로
// 이 스크립트에서는 별도로 mongoose.connect() 호출하면 충돌 발생
// 따라서 connectDB 함수를 직접 사용

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

/**
 * 성능 측정 헬퍼
 */
async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>,
  iterations: number = 5
): Promise<{ avg: number; min: number; max: number; results: T[] }> {
  const times: number[] = [];
  const results: T[] = [];

  console.log(`\n⏱️  ${name}:`);

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    const result = await fn();
    const elapsed = Date.now() - start;

    times.push(elapsed);
    results.push(result);

    console.log(`  ${i + 1}/${iterations}: ${elapsed}ms`);
  }

  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const min = Math.min(...times);
  const max = Math.max(...times);

  console.log(`  📊 평균: ${avg}ms | 최소: ${min}ms | 최대: ${max}ms`);

  return { avg, min, max, results };
}

/**
 * 메인 벤치마크
 */
async function runBenchmark() {
  let connectDB: any;
  let loadEffectivePermissions: any;
  let redis: any;
  let RedisKeys: any;

  try {
    // 1. 동적으로 모듈 로드 (connectDB가 이미 연결되어 있을 수 있음)
    console.log('📦 모듈 로드 중...\n');
    connectDB = (await import('../src/lib/mongodb')).default;
    const permModule = await import('../src/lib/rbac/permissions');
    loadEffectivePermissions = permModule.loadEffectivePermissions;

    try {
      const redisModule = await import('../src/lib/redis');
      redis = redisModule.redis;
      RedisKeys = redisModule.RedisKeys;
    } catch {
      console.log('⚠️  Redis 모듈 로드 실패 (캐시 없이 진행)\n');
    }

    // 2. MongoDB 연결
    console.log('🔗 MongoDB 연결 중...\n');
    await connectDB();
    console.log('✅ MongoDB 연결 성공\n');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }

    // 3. 테스트 대상 사용자 조회
    console.log('👤 테스트 대상 사용자 조회 중...');
    const users = await db
      .collection('users')
      .find({ role: { $in: ['admin', 'examiner', 'user'] } })
      .limit(3)
      .toArray();

    if (users.length === 0) {
      console.error('❌ 테스트할 사용자가 없습니다.');
      process.exit(1);
    }

    console.log(`✅ ${users.length}명의 사용자 발견\n`);
    console.log('='.repeat(70));

    // 4. 각 사용자별 벤치마크
    for (const user of users) {
      const userId = user._id.toString();
      const userName = user.name || user.email;
      const userRole = user.role || 'user';

      console.log(`\n👤 [${userRole.toUpperCase()}] ${userName}`);
      console.log('-'.repeat(70));

      // Redis 캐시 초기화 (공정한 비교를 위해)
      if (redis && RedisKeys) {
        try {
          await redis.del(RedisKeys.userPermissions(userId));
          console.log('  🗑️  Redis 캐시 초기화 완료\n');
        } catch (error) {
          console.log('  ⚠️  Redis 캐시 초기화 실패\n');
        }
      } else {
        console.log('  ℹ️  Redis 캐시 없음 (DB 직접 조회)\n');
      }

      // 4-1. Aggregation Pipeline (새 방식)
      const aggregationResult = await measurePerformance(
        'Aggregation Pipeline (최적화)',
        async () => {
          // 캐시 무효화 (매 iteration마다)
          if (redis && RedisKeys) {
            try {
              await redis.del(RedisKeys.userPermissions(userId));
            } catch {}
          }

          return await loadEffectivePermissions(userId, true);
        },
        5
      );

      // 4-2. Legacy (기존 방식)
      const legacyResult = await measurePerformance(
        'Legacy Method (기존)',
        async () => {
          // 캐시 무효화 (매 iteration마다)
          if (redis && RedisKeys) {
            try {
              await redis.del(RedisKeys.userPermissions(userId));
            } catch {}
          }

          return await loadEffectivePermissions(userId, false);
        },
        5
      );

      // 5. 결과 비교
      console.log(`\n  📈 성능 개선:`);
      const improvement = ((legacyResult.avg - aggregationResult.avg) / legacyResult.avg) * 100;
      console.log(`    ${legacyResult.avg}ms → ${aggregationResult.avg}ms (${improvement.toFixed(1)}% 개선)`);

      // 6. 권한 일치 검증
      const aggregationPerms = aggregationResult.results[0];
      const legacyPerms = legacyResult.results[0];

      const aggregationArray = Array.from(aggregationPerms).sort();
      const legacyArray = Array.from(legacyPerms).sort();

      const match = JSON.stringify(aggregationArray) === JSON.stringify(legacyArray);

      console.log(`\n  ✅ 권한 일치 검증: ${match ? '✅ 통과' : '❌ 실패'}`);
      console.log(`    Aggregation: ${aggregationPerms.size}개 권한`);
      console.log(`    Legacy: ${legacyPerms.size}개 권한`);

      if (!match) {
        console.log(`\n  ⚠️  권한 불일치 감지!`);
        console.log(`    Aggregation Only: ${aggregationArray.filter(p => !legacyArray.includes(p)).join(', ')}`);
        console.log(`    Legacy Only: ${legacyArray.filter(p => !aggregationArray.includes(p)).join(', ')}`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ 벤치마크 완료!\n');
  } catch (error) {
    console.error('❌ 벤치마크 실패:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 종료\n');
  }
}

runBenchmark();
