const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

/**
 * 전문가 연결 상태 디버깅 스크립트
 *
 * @purpose API 응답과 동일한 형태로 데이터를 가져와서 비교 로직 검증
 */
async function debugExpertConnection() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('naraddon');

    console.log('\n=== 전문가 목록 조회 (API 응답 시뮬레이션) ===');
    const experts = await db.collection('experts')
      .find({})
      .sort({ name: 1 })
      .toArray();

    const expertsFormatted = experts.map(expert => ({
      ...expert,
      _id: expert._id.toString()  // API와 동일하게 문자열 변환
    }));

    console.log(`\n총 ${expertsFormatted.length}명의 전문가`);

    console.log('\n=== 사용자 목록 조회 (API 응답 시뮬레이션) ===');
    const users = await db.collection('users')
      .find({})
      .project({
        password: 0,
        authToken: 0
      })
      .toArray();

    const usersFormatted = users.map(user => ({
      _id: user._id.toString(),  // API와 동일하게 문자열 변환
      email: user.email,
      name: user.name,
      role: user.role || 'user',
      expertId: user.expertId
    }));

    console.log(`\n총 ${usersFormatted.length}명의 사용자`);

    console.log('\n=== 연결 상태 확인 (프론트엔드 로직 시뮬레이션) ===');

    expertsFormatted.forEach((expert) => {
      console.log(`\n전문가: ${expert.name}`);
      console.log(`  expert._id: ${expert._id} (${typeof expert._id})`);
      console.log(`  expert.userId: ${expert.userId} (${typeof expert.userId})`);

      // 현재 프론트엔드 로직
      const linkedUser = usersFormatted.find(u => {
        const userId = typeof u._id === 'string' ? u._id : u._id?.toString();
        return userId === expert.userId || u.id === expert.userId;
      });

      if (linkedUser) {
        console.log(`  ✅ 연결됨: ${linkedUser.name} (${linkedUser.email})`);
        console.log(`    user._id: ${linkedUser._id} (${typeof linkedUser._id})`);
        console.log(`    비교 결과: ${linkedUser._id} === ${expert.userId} → ${linkedUser._id === expert.userId}`);
      } else {
        console.log(`  ❌ 연결 안됨`);

        // 디버깅: expertId로 역방향 검색
        const userByExpertId = usersFormatted.find(u => u.expertId === expert._id);
        if (userByExpertId) {
          console.log(`  ⚠️ 역방향 연결 발견: ${userByExpertId.name}`);
          console.log(`    user.expertId: ${userByExpertId.expertId}`);
          console.log(`    expert._id: ${expert._id}`);
        }
      }
    });

    console.log('\n=== 성민석 전문가 상세 확인 ===');
    const minseok = expertsFormatted.find(e => e.name === '성민석');
    if (minseok) {
      console.log('전문가 정보:');
      console.log(`  _id: ${minseok._id}`);
      console.log(`  userId: ${minseok.userId}`);
      console.log(`  name: ${minseok.name}`);

      const minseokUser = usersFormatted.find(u => u._id === minseok.userId);
      if (minseokUser) {
        console.log('\n연결된 사용자:');
        console.log(`  _id: ${minseokUser._id}`);
        console.log(`  name: ${minseokUser.name}`);
        console.log(`  email: ${minseokUser.email}`);
        console.log(`  role: ${minseokUser.role}`);
        console.log(`  expertId: ${minseokUser.expertId}`);
      } else {
        console.log('\n❌ 연결된 사용자를 찾을 수 없음');
        console.log('가능한 원인:');
        console.log('1. userId 값이 잘못됨');
        console.log('2. 해당 사용자가 DB에 없음');
        console.log('3. 타입 비교 문제');
      }
    }

  } finally {
    await client.close();
  }
}

debugExpertConnection().catch(console.error);
