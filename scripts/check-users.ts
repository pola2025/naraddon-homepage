/**
 * 기존 사용자 role 확인 스크립트
 *
 * @purpose MongoDB users 컬렉션의 role 분포 확인
 * @usage npm run check:users
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다.');
  console.error('   .env.local 파일을 확인해주세요.');
  process.exit(1);
}

interface User {
  _id: mongoose.Types.ObjectId;
  email: string;
  name?: string;
  role?: string;
}

async function checkUsers() {
  try {
    console.log('🔗 MongoDB 연결 중...\n');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 연결 성공\n');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }

    // 1. 전체 사용자 수 확인
    const totalUsers = await db.collection('users').countDocuments();
    console.log(`📊 총 사용자 수: ${totalUsers}명\n`);

    // 2. role별 분포 확인
    console.log('📋 Role 분포:\n');
    console.log('='.repeat(60));

    const roles = ['user', 'examiner', 'admin', 'super_admin', null];
    for (const role of roles) {
      const count = await db.collection('users').countDocuments(
        role === null ? { role: { $exists: false } } : { role }
      );
      const percentage = ((count / totalUsers) * 100).toFixed(1);

      const roleName = role === null ? '(role 없음)' : role;
      console.log(`  ${roleName.padEnd(20)}: ${count}명 (${percentage}%)`);
    }

    console.log('='.repeat(60));

    // 3. admin/examiner 사용자 목록 확인
    console.log('\n👥 Admin 및 Examiner 사용자:\n');
    console.log('='.repeat(60));

    const adminUsers = await db.collection('users')
      .find({ role: { $in: ['admin', 'super_admin', 'examiner'] } })
      .project({ email: 1, name: 1, role: 1 })
      .toArray() as User[];

    if (adminUsers.length === 0) {
      console.log('  ⚠️ admin/examiner 권한을 가진 사용자가 없습니다!');
    } else {
      for (const user of adminUsers) {
        console.log(`  - ${user.email}`);
        console.log(`    이름: ${user.name || '(없음)'}`);
        console.log(`    역할: ${user.role}`);
        console.log(`    ID: ${user._id}`);
        console.log('');
      }
    }

    console.log('='.repeat(60));

    // 4. 최근 가입 사용자 (role 확인용)
    console.log('\n📅 최근 가입 사용자 (5명):\n');
    console.log('='.repeat(60));

    const recentUsers = await db.collection('users')
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .project({ email: 1, name: 1, role: 1, createdAt: 1 })
      .toArray();

    for (const user of recentUsers) {
      const userData = user as any;
      console.log(`  - ${userData.email}`);
      console.log(`    이름: ${userData.name || '(없음)'}`);
      console.log(`    역할: ${userData.role || '(기본: user)'}`);
      console.log(`    가입일: ${userData.createdAt ? new Date(userData.createdAt).toLocaleString('ko-KR') : '(없음)'}`);
      console.log('');
    }

    console.log('='.repeat(60));

    // 5. RBAC 권한 예측
    console.log('\n🔐 RBAC 시스템 권한 예측:\n');
    console.log('='.repeat(60));

    const roleCounts = {
      user: await db.collection('users').countDocuments({ $or: [{ role: 'user' }, { role: { $exists: false } }] }),
      examiner: await db.collection('users').countDocuments({ role: 'examiner' }),
      admin: await db.collection('users').countDocuments({ role: 'admin' }),
      super_admin: await db.collection('users').countDocuments({ role: 'super_admin' }),
    };

    console.log('\n각 역할별 사용자가 가질 퍼미션:');
    console.log('');
    console.log(`✅ user (${roleCounts.user}명):`);
    console.log('   - policy:analysis:read (정책분석 조회)');
    console.log('   - policy:news:read (정책뉴스 조회)');
    console.log('   - community:post:write (게시글 작성)');
    console.log('');
    console.log(`✅ examiner (${roleCounts.examiner}명):`);
    console.log('   - user 권한 + 아래 추가:');
    console.log('   - policy:analysis:write (정책분석 작성) ⭐');
    console.log('   - policy:news:write (정책뉴스 작성) ⭐');
    console.log('   - examiner:read (심사관 정보 조회)');
    console.log('');
    console.log(`✅ admin (${roleCounts.admin}명):`);
    console.log('   - examiner 권한 + 아래 추가:');
    console.log('   - user:read, user:manage (사용자 관리)');
    console.log('   - user:role:update (역할 변경)');
    console.log('   - examiner:manage (심사관 관리)');
    console.log('   - community:post:manage (게시글 관리)');
    console.log('');
    console.log(`✅ super_admin (${roleCounts.super_admin}명):`);
    console.log('   - admin 권한 + 모든 권한 (*) ');
    console.log('');

    console.log('='.repeat(60));

    console.log('\n\n✅ 기존 사용자 데이터 확인 완료!');
    console.log('\n📌 중요 사항:');
    console.log('  - 모든 기존 사용자는 RBAC 시스템에서 자동으로 role 기반 권한 부여');
    console.log('  - 로그아웃/재로그인 불필요 (fallback 로직 적용)');
    console.log('  - Redis 캐시로 성능 유지 (TTL 60초)');
    console.log('');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 종료\n');
  }
}

checkUsers();
