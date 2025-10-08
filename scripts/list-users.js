/**
 * 사용자 목록 조회 스크립트
 *
 * @purpose MongoDB에 등록된 모든 사용자 목록 조회
 * @usage node scripts/list-users.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

async function listUsers() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ MongoDB 연결 성공\n');

    const db = client.db('naraddon');
    const usersCollection = db.collection('users');

    const users = await usersCollection.find({}).toArray();

    if (users.length === 0) {
      console.log('📋 등록된 사용자가 없습니다.');
      return;
    }

    console.log(`📋 전체 사용자 목록 (${users.length}명)\n`);
    console.log('═══════════════════════════════════════════════════════════════');

    users.forEach((user, index) => {
      console.log(`\n[${index + 1}] ${user.name} (${user.email})`);
      console.log(`    Role: ${user.role || 'user'}`);
      console.log(`    Provider: ${user.provider || 'N/A'}`);
      console.log(`    Status: ${user.status || 'active'}`);
      console.log(`    가입일: ${user.createdAt ? new Date(user.createdAt).toLocaleString('ko-KR') : 'N/A'}`);
      console.log(`    최근 로그인: ${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('ko-KR') : 'N/A'}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('\n💡 사용자 권한 변경: node scripts/update-user-role.js <이메일>');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await client.close();
  }
}

listUsers();
