/**
 * MongoDB 사용자 데이터 확인 스크립트
 *
 * @purpose 실제 DB에 저장된 사용자 목록 조회
 * @context 사용자 관리 페이지에서 사용자가 안 보이는 문제 디버깅
 */
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function checkUsers() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ MongoDB 연결 성공\n');

    const db = client.db('naraddon');
    const usersCollection = db.collection('users');

    // 전체 사용자 수
    const totalUsers = await usersCollection.countDocuments();
    console.log(`📊 전체 사용자 수: ${totalUsers}명\n`);

    if (totalUsers === 0) {
      console.log('⚠️ 등록된 사용자가 없습니다.');
      console.log('   네이버 로그인을 한 번 시도해보세요.\n');
      return;
    }

    // 사용자 목록 조회
    const users = await usersCollection.find({}).limit(10).toArray();

    console.log('👥 최근 사용자 목록 (최대 10명):\n');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   - 역할: ${user.role || 'user'}`);
      console.log(`   - 상태: ${user.status || 'active'}`);
      console.log(`   - 가입일: ${user.createdAt ? new Date(user.createdAt).toLocaleString('ko-KR') : 'N/A'}`);
      console.log(`   - 최근 로그인: ${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('ko-KR') : 'N/A'}`);
      console.log('');
    });

    // 역할별 통계
    const roleStats = await usersCollection.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    console.log('📈 역할별 통계:');
    roleStats.forEach(stat => {
      console.log(`   - ${stat._id || 'undefined'}: ${stat.count}명`);
    });

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await client.close();
  }
}

checkUsers();
