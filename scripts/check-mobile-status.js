/**
 * 사용자 전화번호 저장 상태 확인 스크립트
 *
 * @purpose 기존 가입자 중 전화번호 저장 여부 확인
 * @usage node scripts/check-mobile-status.js
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function checkMobileStatus() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ MongoDB 연결 성공\n');

    const db = client.db('naraddon');
    const usersCollection = db.collection('users');

    // 전체 사용자 수
    const totalUsers = await usersCollection.countDocuments({});
    console.log(`📊 전체 사용자: ${totalUsers}명`);

    // 전화번호 있는 사용자
    const usersWithMobile = await usersCollection.countDocuments({
      mobile: { $exists: true, $ne: null, $ne: '' }
    });
    console.log(`✅ 전화번호 저장됨: ${usersWithMobile}명`);

    // 전화번호 없는 사용자
    const usersWithoutMobile = await usersCollection.countDocuments({
      $or: [
        { mobile: { $exists: false } },
        { mobile: null },
        { mobile: '' }
      ]
    });
    console.log(`❌ 전화번호 없음: ${usersWithoutMobile}명`);

    // 저장률 계산
    const percentage = ((usersWithMobile / totalUsers) * 100).toFixed(2);
    console.log(`\n📈 전화번호 저장률: ${percentage}%`);

    // 전화번호 없는 사용자 샘플 (최대 5명)
    console.log('\n📋 전화번호 없는 사용자 샘플:');
    const samples = await usersCollection
      .find({
        $or: [
          { mobile: { $exists: false } },
          { mobile: null },
          { mobile: '' }
        ]
      })
      .limit(5)
      .project({ email: 1, name: 1, createdAt: 1 })
      .toArray();

    samples.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - 가입: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : 'N/A'}`);
    });

    console.log('\n💡 참고: 기존 사용자는 다음 로그인 시 자동으로 전화번호가 저장됩니다.');

  } catch (error) {
    console.error('❌ 에러:', error);
  } finally {
    await client.close();
  }
}

checkMobileStatus();
