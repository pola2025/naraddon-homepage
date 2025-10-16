/**
 * RBAC 시스템 실시간 동작 테스트
 *
 * @purpose 실제 사용자 권한이 올바르게 로드되는지 확인
 * @usage npx tsx scripts/test-rbac-live.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import { loadEffectivePermissions } from '@/lib/rbac/permissions';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

async function testLiveRBAC() {
  try {
    console.log('🔗 MongoDB 연결 중...\n');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 연결 성공\n');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }

    // 테스트할 사용자들
    const testUsers = [
      { email: 'framei@naver.com', name: '이재호', expectedRole: 'admin' },
      { email: 'bibiwos@naver.com', name: '박현숙', expectedRole: 'examiner' },
      { email: 'jjk101syj@naver.com', name: '서영주', expectedRole: 'user' },
    ];

    console.log('🧪 실시간 RBAC 권한 로드 테스트\n');
    console.log('='.repeat(70));

    for (const testUser of testUsers) {
      const user = await db.collection('users').findOne({ email: testUser.email });

      if (!user) {
        console.log(`\n⚠️  ${testUser.name} (${testUser.email}) - 사용자 없음`);
        continue;
      }

      console.log(`\n👤 ${testUser.name} (${testUser.email})`);
      console.log(`   DB role: ${user.role || '(없음)'}`);
      console.log(`   User ID: ${user._id}`);

      // 실제 RBAC 권한 로드
      const permissions = await loadEffectivePermissions(user._id.toString());

      console.log(`\n   📋 로드된 권한 (${permissions.size}개):`);

      if (permissions.size === 0) {
        console.log('   ❌ 권한이 로드되지 않았습니다!');
      } else {
        const permArray = Array.from(permissions).sort();
        for (const perm of permArray) {
          console.log(`      ✓ ${perm}`);
        }
      }

      // 예상 권한 검증
      const hasWritePermission = permissions.has('policy:analysis:write') || permissions.has('*');
      const expectedWrite = testUser.expectedRole === 'admin' || testUser.expectedRole === 'examiner';

      console.log(`\n   🔍 권한 검증:`);
      console.log(`      정책분석 작성 권한: ${hasWritePermission ? '✅ 있음' : '❌ 없음'}`);
      console.log(`      예상 결과: ${expectedWrite ? '있어야 함' : '없어야 함'}`);

      if (hasWritePermission === expectedWrite) {
        console.log(`      ✅ 통과`);
      } else {
        console.log(`      ❌ 실패 - 권한 매핑 오류!`);
      }

      console.log('-'.repeat(70));
    }

    console.log('\n✅ 실시간 테스트 완료!');

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB 연결 종료\n');
  }
}

testLiveRBAC();
