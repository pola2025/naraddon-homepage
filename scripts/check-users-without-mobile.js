/**
 * 전화번호 없는 사용자 상세 분석
 *
 * @purpose 전화번호가 없는 사용자들의 가입일 및 패턴 분석
 * @usage node scripts/check-users-without-mobile.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkUsersWithoutMobile() {
  try {
    console.log('MongoDB 연결 중...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ MongoDB 연결 성공\n');

    const db = mongoose.connection.db;

    // 전화번호 없는 사용자 조회
    console.log('=== 전화번호 없는 사용자 목록 ===\n');
    const usersWithoutMobile = await db.collection('users')
      .find({
        $or: [
          { mobile: { $exists: false } },
          { mobile: null },
          { mobile: '' }
        ]
      })
      .sort({ createdAt: -1 })
      .toArray();

    if (usersWithoutMobile.length === 0) {
      console.log('✅ 전화번호 없는 사용자가 없습니다.\n');
    } else {
      console.log(`❌ ${usersWithoutMobile.length}명의 사용자에게 전화번호가 없습니다:\n`);

      usersWithoutMobile.forEach((user, index) => {
        console.log(`[${index + 1}] ${user.name || '이름 없음'} (${user.email || '이메일 없음'})`);
        console.log(`  - 가입일: ${user.createdAt || '없음'}`);
        console.log(`  - 마지막 로그인: ${user.lastLoginAt || '없음'}`);
        console.log(`  - Role: ${user.role || '없음'}`);
        console.log('');
      });

      // 가입일 기준 분석
      const now = new Date();
      const recentUsers = usersWithoutMobile.filter(u => {
        if (!u.createdAt) return false;
        const daysDiff = (now - new Date(u.createdAt)) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7; // 최근 7일 이내
      });

      const oldUsers = usersWithoutMobile.filter(u => {
        if (!u.createdAt) return false;
        const daysDiff = (now - new Date(u.createdAt)) / (1000 * 60 * 60 * 24);
        return daysDiff > 7;
      });

      console.log('=== 가입 시기별 분석 ===\n');
      console.log(`  - 최근 7일 이내 가입 (전화번호 없음): ${recentUsers.length}명`);
      console.log(`  - 7일 이전 가입 (전화번호 없음): ${oldUsers.length}명`);
      console.log('');

      if (recentUsers.length > 0) {
        console.log('⚠️ 최근 가입자 중 전화번호 없는 사용자:');
        recentUsers.forEach(u => {
          console.log(`  - ${u.name} (${u.email}) - ${u.createdAt}`);
        });
        console.log('');
      }
    }

    // 전화번호 있는 최초 사용자 확인 (언제부터 저장되기 시작했는지)
    console.log('=== 전화번호 저장 시작 시점 분석 ===\n');
    const firstUserWithMobile = await db.collection('users')
      .find({ mobile: { $exists: true, $ne: null, $ne: '' } })
      .sort({ createdAt: 1 })
      .limit(1)
      .toArray();

    if (firstUserWithMobile.length > 0) {
      const user = firstUserWithMobile[0];
      console.log(`✓ 전화번호 저장 시작 시점:`);
      console.log(`  - 사용자: ${user.name} (${user.email})`);
      console.log(`  - 전화번호: ${user.mobile}`);
      console.log(`  - 가입일: ${user.createdAt}`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB 연결 종료');
  }
}

checkUsersWithoutMobile();
