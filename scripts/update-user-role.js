/**
 * 사용자 권한 업데이트 스크립트
 *
 * @purpose MongoDB에서 특정 사용자의 role을 admin으로 변경
 * @usage node scripts/update-user-role.js <이메일>
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const email = process.argv[2];

if (!email) {
  console.error('❌ 이메일을 입력해주세요.');
  console.log('사용법: node scripts/update-user-role.js <이메일>');
  process.exit(1);
}

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

async function updateUserRole() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ MongoDB 연결 성공\n');

    const db = client.db('naraddon');
    const usersCollection = db.collection('users');

    // 사용자 찾기
    const user = await usersCollection.findOne({ email });

    if (!user) {
      console.error(`❌ 사용자를 찾을 수 없습니다: ${email}`);
      process.exit(1);
    }

    console.log('📋 현재 사용자 정보:');
    console.log(`   이름: ${user.name}`);
    console.log(`   이메일: ${user.email}`);
    console.log(`   현재 Role: ${user.role}`);
    console.log(`   가입일: ${user.createdAt}\n`);

    if (user.role === 'admin' || user.role === 'super_admin') {
      console.log('✅ 이미 관리자 권한을 가지고 있습니다.');
      return;
    }

    // Role을 admin으로 변경
    const result = await usersCollection.updateOne(
      { email },
      {
        $set: {
          role: 'admin',
          updatedAt: new Date(),
        }
      }
    );

    if (result.modifiedCount === 1) {
      console.log('✅ 사용자 권한이 admin으로 변경되었습니다.');
      console.log('\n🔄 브라우저에서 로그아웃 후 다시 로그인해주세요.');
    } else {
      console.error('❌ 권한 변경에 실패했습니다.');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await client.close();
  }
}

updateUserRole();
