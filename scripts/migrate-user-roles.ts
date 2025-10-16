/**
 * users.role → user_roles 마이그레이션 스크립트
 *
 * @purpose 기존 users 컬렉션의 role 필드를 user_roles 컬렉션으로 마이그레이션
 * @usage npm run migrate:user-roles
 * @safety 기존 users.role 필드는 유지 (하위 호환성)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import Role from '../src/models/Role';
import UserRole from '../src/models/UserRole';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

async function migrateUserRoles() {
  try {
    console.log('🔗 MongoDB 연결 중...\n');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 연결 성공\n');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }

    // 1. users 컬렉션에서 모든 사용자 조회
    console.log('👤 사용자 조회 중...');
    const users = await db.collection('users').find({}).toArray();

    console.log(`✅ ${users.length}명의 사용자 발견\n`);
    console.log('='.repeat(70));

    // 2. 역할 이름 → ObjectId 매핑
    console.log('\n🎭 역할 매핑 로드 중...');
    const roles = await Role.find({});
    const roleMap = new Map<string, mongoose.Types.ObjectId>();

    for (const role of roles) {
      roleMap.set(role.name, role._id);
      console.log(`  ✓ ${role.name} → ${role._id}`);
    }

    if (roleMap.size === 0) {
      console.error('\n❌ 역할이 없습니다. 먼저 npm run seed:rbac를 실행하세요.');
      process.exit(1);
    }

    // 3. 각 사용자의 role을 user_roles로 마이그레이션
    console.log('\n📦 user_roles 마이그레이션 중...\n');

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      const userId = user._id;
      const userName = user.name || user.email;
      const userRole = user.role || 'user'; // 기본값: user

      try {
        // 역할 ID 조회
        const roleId = roleMap.get(userRole);

        if (!roleId) {
          console.warn(`  ⚠️  [${userName}] 알 수 없는 역할: ${userRole} → user로 설정`);
          const defaultRoleId = roleMap.get('user');
          if (!defaultRoleId) {
            console.error(`  ❌ [${userName}] 기본 역할(user)을 찾을 수 없음`);
            errorCount++;
            continue;
          }

          // user_roles 생성 (기존 레코드 확인)
          const existing = await UserRole.findOne({ userId, roleId: defaultRoleId });

          if (existing) {
            console.log(`  ⊙ [${userName}] 이미 마이그레이션됨 (user)`);
            skippedCount++;
          } else {
            await UserRole.create({
              userId,
              roleId: defaultRoleId,
              grantedBy: null,
              grantedAt: new Date(),
              expiresAt: null,
            });
            console.log(`  ✓ [${userName}] user 역할 할당`);
            migratedCount++;
          }
        } else {
          // user_roles 생성 (기존 레코드 확인)
          const existing = await UserRole.findOne({ userId, roleId });

          if (existing) {
            console.log(`  ⊙ [${userName}] 이미 마이그레이션됨 (${userRole})`);
            skippedCount++;
          } else {
            await UserRole.create({
              userId,
              roleId,
              grantedBy: null,
              grantedAt: new Date(),
              expiresAt: null,
            });
            console.log(`  ✓ [${userName}] ${userRole} 역할 할당`);
            migratedCount++;
          }
        }
      } catch (error) {
        console.error(`  ❌ [${userName}] 마이그레이션 실패:`, error);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ 마이그레이션 완료!\n');
    console.log('📊 결과:');
    console.log(`  - 마이그레이션: ${migratedCount}명`);
    console.log(`  - 스킵: ${skippedCount}명 (이미 존재)`);
    console.log(`  - 에러: ${errorCount}명`);

    // 4. 검증
    console.log('\n🔍 검증 중...');
    const userRolesCount = await UserRole.countDocuments();
    console.log(`  - user_roles 컬렉션: ${userRolesCount}개 레코드`);
    console.log(`  - users 컬렉션: ${users.length}명`);

    if (userRolesCount >= users.length) {
      console.log('\n✅ 검증 통과: 모든 사용자가 역할을 가지고 있습니다.\n');
    } else {
      console.warn('\n⚠️  경고: user_roles 레코드가 사용자보다 적습니다.\n');
    }

    // 5. Role 분포 확인
    console.log('📊 Role 분포:\n');
    const roleDistribution = await UserRole.aggregate([
      {
        $lookup: {
          from: 'roles',
          localField: 'roleId',
          foreignField: '_id',
          as: 'role',
        },
      },
      { $unwind: '$role' },
      {
        $group: {
          _id: '$role.name',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    console.log('='.repeat(60));
    for (const dist of roleDistribution) {
      const percentage = ((dist.count / userRolesCount) * 100).toFixed(1);
      console.log(`  ${dist._id.padEnd(20)}: ${dist.count}명 (${percentage}%)`);
    }
    console.log('='.repeat(60));

    console.log('\n🎉 마이그레이션이 성공적으로 완료되었습니다!\n');
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 종료\n');
  }
}

migrateUserRoles();
