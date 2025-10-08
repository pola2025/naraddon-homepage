/**
 * 관리자 API 테스트 스크립트
 *
 * @purpose /api/admin/users API가 제대로 응답하는지 테스트
 * @context 사용자 관리 페이지에서 사용자 목록이 안 보이는 문제 디버깅
 */
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function testAdminAPI() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ MongoDB 연결 성공\n');

    const db = client.db('naraddon');

    // API 로직과 동일하게 데이터 가져오기
    const filter = {};
    const users = await db.collection('users')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .project({
        password: 0,
        authToken: 0
      })
      .toArray();

    console.log(`📊 조회된 사용자 수: ${users.length}명\n`);

    // 각 사용자의 상담 배정 개수 추가
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const assignedConsultations = await db.collection('consultations')
          .countDocuments({ assignedStaffId: user.email });

        return {
          _id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role || 'user',
          profile: user.profile,
          auditorProfile: user.auditorProfile,
          expertProfile: user.expertProfile,
          examinerId: user.examinerId,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          assignedConsultations
        };
      })
    );

    console.log('✅ API 응답 형식으로 변환 완료\n');
    console.log('📝 응답 데이터 샘플 (첫 3명):');
    console.log(JSON.stringify(usersWithStats.slice(0, 3), null, 2));

    console.log('\n\n📤 예상 API 응답:');
    const response = {
      users: usersWithStats,
      total: users.length,
      limit: 100,
      skip: 0
    };
    console.log(JSON.stringify(response, null, 2));

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await client.close();
  }
}

testAdminAPI();
