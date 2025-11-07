/**
 * 사용자 role 확인 스크립트
 *
 * @purpose 이재호 사용자의 실제 role 값 확인
 * @usage node scripts/check-user-role.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkUserRole() {
  try {
    console.log('MongoDB 연결 중...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ MongoDB 연결 성공\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

    // 특정 사용자 찾기
    console.log('사용자 검색 중: 이재호, 김도현, 김지완...');
    const users = await User.find({
      $or: [
        { name: { $regex: '이재호', $options: 'i' } },
        { email: { $regex: '이재호', $options: 'i' } },
        { name: { $regex: '김도현', $options: 'i' } },
        { email: { $regex: '김도현', $options: 'i' } },
        { name: { $regex: '김지완', $options: 'i' } },
        { email: { $regex: '김지완', $options: 'i' } }
      ]
    }).lean();

    if (users.length === 0) {
      console.log('❌ 해당 사용자를 찾을 수 없습니다.');
      return;
    }

    console.log(`✓ ${users.length}명의 사용자를 찾았습니다:\n`);

    users.forEach((user, index) => {
      console.log(`[${index + 1}] 사용자 정보:`);
      console.log(`  - 이름: ${user.name}`);
      console.log(`  - 이메일: ${user.email}`);
      console.log(`  - Role: "${user.role}" (타입: ${typeof user.role})`);
      console.log(`  - Status: ${user.status}`);
      console.log(`  - 가입일: ${user.createdAt}`);
      console.log('');

      // Role 체크
      if (user.role === 'admin') {
        console.log('  ✓ role이 "admin"입니다 - 권한회수 버튼이 보여야 합니다.');
      } else if (user.role === 'super_admin') {
        console.log('  ⚠ role이 "super_admin"입니다 - 권한회수 버튼이 안 보입니다.');
      } else if (user.role === 'examiner') {
        console.log('  ℹ role이 "examiner"입니다 - 관리자승격 버튼이 보여야 합니다.');
      } else {
        console.log(`  ⚠ role이 "${user.role}"입니다 - 예상과 다른 값입니다.`);
      }
      console.log('\n---\n');
    });

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB 연결 종료');
  }
}

checkUserRole();
