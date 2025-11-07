/**
 * 사용자 role 변경 이력 확인
 *
 * @usage node scripts/check-role-history.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkRoleHistory() {
  try {
    console.log('MongoDB 연결 중...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ MongoDB 연결 성공\n');

    // roleLogs 컬렉션 확인
    const db = mongoose.connection.db;
    const roleLogs = await db.collection('roleLogs').find({
      $or: [
        { userId: { $regex: '김도현', $options: 'i' } },
        { userId: { $regex: '김지완', $options: 'i' } },
        { userId: 'govkr_kdh@naver.com' },
        { userId: 'kyjkyjkyj4465@naver.com' }
      ]
    }).sort({ changedAt: -1 }).toArray();

    console.log(`✓ ${roleLogs.length}개의 role 변경 이력을 찾았습니다:\n`);

    if (roleLogs.length === 0) {
      console.log('❌ role 변경 이력이 없습니다.');
      console.log('→ 가입 시부터 현재 role을 유지 중입니다.\n');
    } else {
      roleLogs.forEach((log, index) => {
        console.log(`[${index + 1}] 변경 이력:`);
        console.log(`  - 사용자: ${log.userId}`);
        console.log(`  - 변경 전: ${log.previousRole}`);
        console.log(`  - 변경 후: ${log.newRole}`);
        console.log(`  - 변경자: ${log.changedBy}`);
        console.log(`  - 변경일: ${log.changedAt}`);
        console.log(`  - 사유: ${log.reason}`);
        console.log('');
      });
    }

    // adminUpgrades 컬렉션도 확인
    console.log('\n=== 관리자 승격/회수 이력 확인 ===\n');
    const adminUpgrades = await db.collection('adminUpgrades').find({
      $or: [
        { userEmail: 'govkr_kdh@naver.com' },
        { userEmail: 'kyjkyjkyj4465@naver.com' }
      ]
    }).sort({ requestedAt: -1 }).toArray();

    if (adminUpgrades.length === 0) {
      console.log('❌ 관리자 승격/회수 이력이 없습니다.\n');
    } else {
      console.log(`✓ ${adminUpgrades.length}개의 관리자 승격/회수 이력을 찾았습니다:\n`);
      adminUpgrades.forEach((upgrade, index) => {
        console.log(`[${index + 1}] 승격/회수 이력:`);
        console.log(`  - 사용자: ${upgrade.userName} (${upgrade.userEmail})`);
        console.log(`  - 변경: ${upgrade.fromRole} → ${upgrade.toRole}`);
        console.log(`  - 실행자: ${upgrade.upgradedByName}`);
        console.log(`  - 실행일: ${upgrade.requestedAt}`);
        console.log(`  - 사유: ${upgrade.reason}`);
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

checkRoleHistory();
