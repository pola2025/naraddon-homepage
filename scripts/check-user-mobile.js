/**
 * MongoDB 사용자 전화번호 확인 스크립트
 *
 * @description
 * - users 컬렉션에서 mobile 필드 보유 현황 확인
 * - 네이버 로그인 사용자 중 전화번호 없는 사용자 리스트
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function checkUserMobile() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ MongoDB connected');

    const db = client.db('naraddon');
    const users = db.collection('users');
    const accounts = db.collection('accounts');

    // 전체 사용자 수
    const totalUsers = await users.countDocuments();
    console.log(`\n📊 전체 사용자: ${totalUsers}명`);

    // mobile 필드가 있는 사용자
    const usersWithMobile = await users.countDocuments({ mobile: { $exists: true, $ne: null } });
    console.log(`📱 전화번호 있음: ${usersWithMobile}명`);
    console.log(`❌ 전화번호 없음: ${totalUsers - usersWithMobile}명`);

    // 네이버 계정 사용자 찾기
    const naverAccounts = await accounts.find({ provider: 'naver' }).toArray();
    console.log(`\n🟢 네이버 로그인 사용자: ${naverAccounts.length}명`);

    // 네이버 사용자 중 전화번호 없는 사람
    const naverUserIds = naverAccounts.map(acc => acc.userId);
    const naverUsersWithoutMobile = await users.find({
      _id: { $in: naverUserIds },
      $or: [
        { mobile: { $exists: false } },
        { mobile: null },
        { mobile: '' }
      ]
    }).toArray();

    if (naverUsersWithoutMobile.length > 0) {
      console.log(`\n⚠️  네이버 로그인 사용자 중 전화번호 없는 사람: ${naverUsersWithoutMobile.length}명`);
      console.log('\n상세 정보:');
      naverUsersWithoutMobile.forEach((user, i) => {
        console.log(`${i + 1}. ${user.name} (${user.email})`);
      });
      console.log('\n💡 이 사용자들은 다시 로그인하면 전화번호가 저장됩니다.');
    } else {
      console.log('\n✅ 모든 네이버 사용자가 전화번호를 가지고 있습니다!');
    }

    // mobile 필드가 있는 사용자 샘플 출력
    const sampleUsersWithMobile = await users.find({ mobile: { $exists: true, $ne: null } }).limit(5).toArray();
    if (sampleUsersWithMobile.length > 0) {
      console.log('\n📋 전화번호 있는 사용자 샘플:');
      sampleUsersWithMobile.forEach((user, i) => {
        console.log(`${i + 1}. ${user.name} - ${user.mobile || '(없음)'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

checkUserMobile();
