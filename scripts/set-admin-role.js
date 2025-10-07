// MongoDB에서 사용자에게 super_admin 역할 부여
const { MongoClient } = require('mongodb');

async function setAdminRole() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ MongoDB 연결 성공');

    const db = client.db('naraddon');
    const usersCollection = db.collection('users');

    const email = 'framei@naver.com';

    // 사용자 확인
    const user = await usersCollection.findOne({ email });

    if (!user) {
      console.log(`❌ 사용자를 찾을 수 없습니다: ${email}`);
      console.log('⚠️  먼저 네이버 로그인을 통해 회원가입을 완료해주세요.');
      process.exit(1);
    }

    console.log('\n📋 현재 사용자 정보:');
    console.log(`  - 이메일: ${user.email}`);
    console.log(`  - 이름: ${user.name || '없음'}`);
    console.log(`  - 현재 역할: ${user.role || '설정되지 않음'}`);

    // super_admin 역할 부여
    const result = await usersCollection.updateOne(
      { email },
      {
        $set: {
          role: 'super_admin',
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('\n✅ super_admin 역할이 성공적으로 부여되었습니다!');

      // 업데이트된 정보 확인
      const updatedUser = await usersCollection.findOne({ email });
      console.log('\n📋 업데이트된 사용자 정보:');
      console.log(`  - 이메일: ${updatedUser.email}`);
      console.log(`  - 역할: ${updatedUser.role}`);
      console.log(`  - 업데이트 시간: ${updatedUser.updatedAt}`);

      console.log('\n🔄 변경사항을 적용하려면:');
      console.log('  1. 브라우저에서 로그아웃');
      console.log('  2. 다시 로그인');
      console.log('  3. 관리자 대시보드 접속');
    } else {
      console.log('\n⚠️  이미 super_admin 역할이 설정되어 있습니다.');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB 연결 종료');
  }
}

setAdminRole();
