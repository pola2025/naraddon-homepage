/**
 * 테스트로 생성된 전문가 사용자 계정 정리
 *
 * @purpose 스크립트로 생성한 example.com 이메일 사용자 삭제
 * @context 실제 전문가는 네이버 로그인 후 관리자가 연결
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI가 설정되지 않았습니다.');
  process.exit(1);
}

async function cleanupTestUsers() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ MongoDB 연결 성공');

    const db = client.db('naraddon');
    const usersCollection = db.collection('users');
    const expertsCollection = db.collection('experts');

    // 1. example.com 이메일 사용자 찾기
    const testUsers = await usersCollection.find({
      email: { $regex: '@example\\.com$' }
    }).toArray();

    console.log(`\n📋 테스트 사용자 ${testUsers.length}명 발견:`);
    testUsers.forEach(user => {
      console.log(`   - ${user.name}: ${user.email} (role: ${user.role})`);
    });

    if (testUsers.length === 0) {
      console.log('\n✅ 삭제할 테스트 사용자가 없습니다.');
      return;
    }

    // 2. experts에서 userId 제거
    console.log('\n🔧 experts 컬렉션에서 userId 연결 해제 중...');
    const result1 = await expertsCollection.updateMany(
      { email: { $regex: '@example\\.com$' } },
      {
        $unset: { userId: '' },
        $set: { updatedAt: new Date() }
      }
    );
    console.log(`   ✅ ${result1.modifiedCount}개 전문가 문서에서 userId 제거`);

    // 3. 테스트 사용자 삭제
    console.log('\n🗑️  테스트 사용자 삭제 중...');
    const result2 = await usersCollection.deleteMany({
      email: { $regex: '@example\\.com$' }
    });
    console.log(`   ✅ ${result2.deletedCount}명 삭제 완료`);

    // 4. 최종 확인
    console.log('\n🎯 최종 상태:');
    const experts = await expertsCollection.find({ isActive: true }).toArray();
    for (const expert of experts) {
      console.log(`   ${expert.name}: userId ${expert.userId ? '연결됨' : '미연결'}`);
    }

    console.log('\n✅ 정리 완료! 이제 관리자가 실제 전문가 계정을 연결할 수 있습니다.');
  } catch (error) {
    console.error('❌ 에러:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

cleanupTestUsers();
