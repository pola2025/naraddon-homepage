/**
 * 사용자 전화번호 저장 상태 확인
 *
 * @purpose 최근 가입 사용자들의 mobile 필드 저장 여부 확인
 * @usage node scripts/check-mobile-status.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkMobileStatus() {
  try {
    console.log('MongoDB 연결 중...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ MongoDB 연결 성공\n');

    const db = mongoose.connection.db;

    // 최근 가입자 10명 조회 (가입일 기준 내림차순)
    console.log('=== 최근 가입 사용자 전화번호 상태 확인 ===\n');
    const recentUsers = await db.collection('users')
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    if (recentUsers.length === 0) {
      console.log('❌ 사용자가 없습니다.\n');
    } else {
      recentUsers.forEach((user, index) => {
        console.log(`[${index + 1}] 사용자 정보:`);
        console.log(`  - 이름: ${user.name || '없음'}`);
        console.log(`  - 이메일: ${user.email || '없음'}`);
        console.log(`  - 전화번호: ${user.mobile || '❌ 없음'}`);
        console.log(`  - Role: ${user.role || '없음'}`);
        console.log(`  - 가입일: ${user.createdAt || '없음'}`);
        console.log(`  - 마지막 로그인: ${user.lastLoginAt || '없음'}`);

        if (user.mobile) {
          console.log(`  ✅ 전화번호 저장됨: ${user.mobile}`);
        } else {
          console.log(`  ❌ 전화번호 누락`);
        }
        console.log('');
      });
    }

    // 통계 출력
    const totalUsers = await db.collection('users').countDocuments({});
    const usersWithMobile = await db.collection('users').countDocuments({ mobile: { $exists: true, $ne: null } });
    const usersWithoutMobile = totalUsers - usersWithMobile;

    console.log('=== 전화번호 저장 통계 ===\n');
    console.log(`  - 총 사용자 수: ${totalUsers}명`);
    console.log(`  - 전화번호 있음: ${usersWithMobile}명 (${((usersWithMobile / totalUsers) * 100).toFixed(1)}%)`);
    console.log(`  - 전화번호 없음: ${usersWithoutMobile}명 (${((usersWithoutMobile / totalUsers) * 100).toFixed(1)}%)`);
    console.log('');

    // 네이버 계정 연결 정보 확인
    console.log('=== 네이버 계정 연결 정보 확인 ===\n');
    const naverAccounts = await db.collection('accounts')
      .find({ provider: 'naver' })
      .limit(5)
      .toArray();

    if (naverAccounts.length === 0) {
      console.log('❌ 네이버 계정 연결 정보가 없습니다.\n');
    } else {
      console.log(`✓ ${naverAccounts.length}개의 네이버 계정 연결 발견\n`);
      naverAccounts.forEach((account, index) => {
        console.log(`[${index + 1}] 계정 연결 정보:`);
        console.log(`  - userId: ${account.userId}`);
        console.log(`  - provider: ${account.provider}`);
        console.log(`  - providerAccountId: ${account.providerAccountId}`);
        console.log(`  - scope: ${account.scope || '없음'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB 연결 종료');
  }
}

checkMobileStatus();
