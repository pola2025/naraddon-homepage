// MongoDB에서 사용자의 role 확인하는 스크립트
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkAdminRole() {
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
    const users = await db.collection('users').find({}).toArray();

    console.log('\n📊 전체 사용자 목록:');
    console.log('====================');

    if (users.length === 0) {
      console.log('⚠️  등록된 사용자가 없습니다.');
    } else {
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. 사용자:`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Role: ${user.role || '(없음)'}`);
        console.log(`   Created: ${user.createdAt || '(없음)'}`);
        console.log(`   Updated: ${user.updatedAt || '(없음)'}`);
      });
    }

    console.log('\n====================\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB 연결 종료');
  }
}

checkAdminRole();
