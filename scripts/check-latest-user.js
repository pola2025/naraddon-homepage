/**
 * 특정 사용자 확인
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function checkUser() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('naraddon');

    const targetEmail = 'imagime2002@naver.com';

    // 해당 이메일 사용자 찾기
    const user = await db.collection('users')
      .findOne({ email: targetEmail });

    if (user) {
      console.log('✅ 사용자 발견:');
      console.log(JSON.stringify(user, null, 2));

      // 해당 사용자의 accounts 정보
      const account = await db.collection('accounts')
        .findOne({ userId: user._id });

      console.log('\n🔐 계정 정보:');
      console.log(account ? JSON.stringify(account, null, 2) : '❌ 없음');
    } else {
      console.log(`❌ ${targetEmail} 사용자를 찾을 수 없습니다.`);

      // 전체 사용자 목록
      const allUsers = await db.collection('users').find({}).toArray();
      console.log(`\n📊 전체 사용자 수: ${allUsers.length}명`);
      console.log('\n📋 전체 이메일 목록:');
      allUsers.forEach((u, i) => {
        console.log(`${i + 1}. ${u.email} (${u.name})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkUser();
