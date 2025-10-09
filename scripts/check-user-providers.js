/**
 * 사용자별 가입 경로 확인 스크립트
 *
 * @description
 * - users와 accounts 컬렉션을 조인하여 각 사용자의 가입 방법 확인
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

async function checkUserProviders() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ MongoDB connected\n');

    const db = client.db('naraddon');
    const users = db.collection('users');
    const accounts = db.collection('accounts');

    // 모든 사용자 가져오기
    const allUsers = await users.find({}).toArray();

    console.log('👥 전체 사용자 목록:\n');

    for (const user of allUsers) {
      // 해당 사용자의 계정 정보 찾기
      const userAccounts = await accounts.find({ userId: user._id }).toArray();

      console.log(`📧 ${user.name} (${user.email})`);
      console.log(`   ID: ${user._id}`);

      if (userAccounts.length > 0) {
        console.log(`   가입 방법:`);
        userAccounts.forEach(acc => {
          console.log(`     - ${acc.provider} (${acc.type || 'oauth'})`);
        });
      } else {
        console.log(`   ⚠️  계정 정보 없음 (직접 생성되었거나 수동 등록)`);
      }

      console.log(`   전화번호: ${user.mobile || '없음'}`);
      console.log(`   생성일: ${user.createdAt ? new Date(user.createdAt).toLocaleString('ko-KR') : '알 수 없음'}`);
      console.log('');
    }

    // 통계
    const providers = {};
    const allAccounts = await accounts.find({}).toArray();
    allAccounts.forEach(acc => {
      providers[acc.provider] = (providers[acc.provider] || 0) + 1;
    });

    console.log('\n📊 가입 방법 통계:');
    Object.entries(providers).forEach(([provider, count]) => {
      console.log(`   ${provider}: ${count}명`);
    });

    const usersWithoutAccount = allUsers.filter(user => {
      const hasAccount = allAccounts.some(acc => acc.userId.equals(user._id));
      return !hasAccount;
    });

    if (usersWithoutAccount.length > 0) {
      console.log(`\n⚠️  계정 정보 없는 사용자: ${usersWithoutAccount.length}명`);
      usersWithoutAccount.forEach(user => {
        console.log(`   - ${user.name} (${user.email})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

checkUserProviders();
