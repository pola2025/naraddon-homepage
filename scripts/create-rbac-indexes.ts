/**
 * RBAC MongoDB 인덱스 생성 스크립트
 *
 * @purpose 권한 조회 성능 최적화 (450ms → 200ms)
 * @usage npm run create:indexes
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

async function createIndexes() {
  try {
    console.log('🔗 MongoDB 연결 중...\n');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 연결 성공\n');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }

    console.log('📋 RBAC 인덱스 생성 중...\n');
    console.log('='.repeat(70));

    // Helper: 인덱스가 없으면 생성
    async function createIndexIfNotExists(
      collName: string,
      indexSpec: any,
      options: any
    ) {
      const existingIndexes = await db.collection(collName).indexes();
      const indexName = options.name;

      // 이름으로 확인
      const existsByName = existingIndexes.some(idx => idx.name === indexName);
      if (existsByName) {
        console.log(`  ⊙ ${indexName} - 이미 존재`);
        return false;
      }

      // 키 스펙으로 확인 (다른 이름으로 같은 인덱스 존재)
      const indexKeys = JSON.stringify(indexSpec);
      const existsByKeys = existingIndexes.some(
        idx => JSON.stringify(idx.key) === indexKeys
      );

      if (existsByKeys) {
        const existing = existingIndexes.find(
          idx => JSON.stringify(idx.key) === indexKeys
        );
        console.log(`  ⊙ ${indexName} - 동일 키 인덱스 존재 (${existing!.name})`);
        return false;
      }

      await db.collection(collName).createIndex(indexSpec, options);
      console.log(`  ✓ ${indexName} - 생성 완료`);
      return true;
    }

    // 1. user_roles 인덱스
    console.log('\n👤 user_roles 컬렉션:');

    // 사용자별 역할 조회 최적화
    await createIndexIfNotExists(
      'user_roles',
      { userId: 1 },
      { name: 'idx_user_roles_userId' }
    );

    // 사용자-역할 유니크 제약
    await createIndexIfNotExists(
      'user_roles',
      { userId: 1, roleId: 1 },
      { unique: true, name: 'idx_user_roles_unique' }
    );

    // 만료 시간 조회 최적화
    await createIndexIfNotExists(
      'user_roles',
      { expiresAt: 1 },
      { sparse: true, name: 'idx_user_roles_expiresAt' }
    );

    // 2. roles 인덱스
    console.log('\n🎭 roles 컬렉션:');

    await createIndexIfNotExists(
      'roles',
      { name: 1 },
      { unique: true, name: 'idx_roles_name' }
    );

    await createIndexIfNotExists(
      'roles',
      { inheritsFrom: 1 },
      { sparse: true, name: 'idx_roles_inheritsFrom' }
    );

    // 3. role_permissions 인덱스
    console.log('\n🔗 role_permissions 컬렉션:');

    await createIndexIfNotExists(
      'role_permissions',
      { roleId: 1 },
      { name: 'idx_role_permissions_roleId' }
    );

    await createIndexIfNotExists(
      'role_permissions',
      { roleId: 1, permissionId: 1 },
      { unique: true, name: 'idx_role_permissions_unique' }
    );

    // 4. permissions 인덱스
    console.log('\n🔑 permissions 컬렉션:');

    await createIndexIfNotExists(
      'permissions',
      { code: 1 },
      { unique: true, name: 'idx_permissions_code' }
    );

    await createIndexIfNotExists(
      'permissions',
      { resource: 1, action: 1 },
      { name: 'idx_permissions_resource_action' }
    );

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ 모든 인덱스 생성 완료!');

    // 인덱스 목록 확인
    console.log('\n📊 생성된 인덱스 확인:\n');

    const collections = ['user_roles', 'roles', 'role_permissions', 'permissions'];
    for (const collName of collections) {
      const indexes = await db.collection(collName).indexes();
      console.log(`${collName}:`);
      for (const idx of indexes) {
        const keys = Object.keys(idx.key).map(k => `${k}: ${idx.key[k]}`).join(', ');
        const unique = idx.unique ? ' [UNIQUE]' : '';
        const sparse = idx.sparse ? ' [SPARSE]' : '';
        console.log(`  - ${idx.name}: { ${keys} }${unique}${sparse}`);
      }
      console.log('');
    }

    console.log('🚀 예상 효과:');
    console.log('  - 권한 조회 속도: 450ms → 200-250ms (약 50% 개선)');
    console.log('  - DB 부하 감소: 쿼리 최적화로 CPU 사용량 감소');
    console.log('  - 캐시 MISS 시 사용자 경험 개선\n');

  } catch (error) {
    console.error('❌ 인덱스 생성 실패:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 종료\n');
  }
}

createIndexes();
