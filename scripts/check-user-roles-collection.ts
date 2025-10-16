/**
 * user_roles 컬렉션 확인
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import UserRole from '../src/models/UserRole';
import Role from '../src/models/Role';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

async function checkUserRoles() {
  try {
    console.log('🔗 MongoDB 연결 중...\n');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 연결 성공\n');

    // 1. user_roles 컬렉션 확인
    const userRolesCount = await UserRole.countDocuments();
    console.log(`📊 user_roles 레코드 수: ${userRolesCount}개\n`);

    if (userRolesCount === 0) {
      console.log('⚠️  user_roles 컬렉션이 비어있습니다!');
      console.log('👉 해결: npm run migrate:user-roles 실행\n');
      process.exit(0);
    }

    // 2. 특정 사용자 (framei@naver.com) 확인
    const userId = '68d2cf4069b693baa8e5102e';
    const userRoles = await UserRole.find({ userId: new mongoose.Types.ObjectId(userId) }).lean();

    console.log('👤 framei@naver.com의 user_roles:');
    console.log('='.repeat(60));

    if (userRoles.length === 0) {
      console.log('❌ user_roles 레코드가 없습니다!');
      console.log('👉 해결: 해당 사용자에 대한 마이그레이션 필요\n');
    } else {
      for (const ur of userRoles) {
        // roleId로 role 조회
        const role = await Role.findById(ur.roleId);
        console.log(`  Role: ${role?.name || 'Unknown'}`);
        console.log(`  Role ID: ${ur.roleId}`);
        console.log(`  Granted At: ${new Date(ur.grantedAt).toLocaleString('ko-KR')}`);
        console.log(`  Expires At: ${ur.expiresAt ? new Date(ur.expiresAt).toLocaleString('ko-KR') : '없음'}`);
        console.log();
      }
    }

    console.log('='.repeat(60));

    // 3. 전체 user_roles 분포 확인
    console.log('\n📊 전체 user_roles 분포:\n');
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
    roleDistribution.forEach((dist) => {
      console.log(`  ${dist._id.padEnd(20)}: ${dist.count}명`);
    });
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ 에러 발생:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB 연결 종료\n');
  }
}

checkUserRoles();
