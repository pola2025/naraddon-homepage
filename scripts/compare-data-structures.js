const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

/**
 * 사용자 관리 vs 전문가 관리 데이터 구조 비교
 *
 * @purpose 두 페이지가 보는 데이터가 일치하는지 확인
 */
async function compareDataStructures() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('naraddon');

    console.log('=== 1. 성민석 사용자 (users 컬렉션) ===');
    const user = await db.collection('users').findOne({ name: '성민석' });

    if (user) {
      console.log('\n사용자 정보:');
      console.log('  _id:', user._id.toString());
      console.log('  name:', user.name);
      console.log('  email:', user.email);
      console.log('  role:', user.role);
      console.log('  expertId:', user.expertId);
      console.log('  examinerId:', user.examinerId);
    } else {
      console.log('❌ 성민석 사용자를 찾을 수 없습니다.');
    }

    console.log('\n=== 2. 성민석 전문가 (experts 컬렉션) ===');
    const expert = await db.collection('experts').findOne({ name: '성민석' });

    if (expert) {
      console.log('\n전문가 정보:');
      console.log('  _id:', expert._id.toString());
      console.log('  name:', expert.name);
      console.log('  userId:', expert.userId);
      console.log('  isActive:', expert.isActive);
    } else {
      console.log('❌ 성민석 전문가를 찾을 수 없습니다.');
    }

    console.log('\n=== 3. 관계 확인 ===');
    if (user && expert) {
      console.log('\n사용자 → 전문가 연결:');
      console.log('  user.expertId:', user.expertId);
      console.log('  expert._id:', expert._id.toString());
      console.log('  일치 여부:', user.expertId === expert._id.toString());

      console.log('\n전문가 → 사용자 연결:');
      console.log('  expert.userId:', expert.userId);
      console.log('  user._id:', user._id.toString());
      console.log('  일치 여부:', expert.userId === user._id.toString());

      console.log('\n양방향 연결 상태:');
      const isBidirectional =
        user.expertId === expert._id.toString() &&
        expert.userId === user._id.toString();

      if (isBidirectional) {
        console.log('✅ 양방향 연결이 정상적으로 설정되어 있습니다.');
      } else {
        console.log('❌ 연결이 올바르지 않습니다!');
        if (user.expertId !== expert._id.toString()) {
          console.log('  ⚠️ user.expertId가 expert._id와 일치하지 않음');
        }
        if (expert.userId !== user._id.toString()) {
          console.log('  ⚠️ expert.userId가 user._id와 일치하지 않음');
        }
      }
    }

    console.log('\n=== 4. API 응답 시뮬레이션 ===');

    // /api/admin/experts 응답 시뮬레이션
    console.log('\n[/api/admin/experts] 응답:');
    const expertsForApi = await db.collection('experts')
      .find({})
      .sort({ name: 1 })
      .toArray();

    const minseokExpertForApi = expertsForApi.find(e => e.name === '성민석');
    if (minseokExpertForApi) {
      console.log('  _id:', minseokExpertForApi._id.toString(), '(string)');
      console.log('  userId:', minseokExpertForApi.userId, `(${typeof minseokExpertForApi.userId})`);
    }

    // /api/admin/users 응답 시뮬레이션
    console.log('\n[/api/admin/users] 응답:');
    const usersForApi = await db.collection('users')
      .find({})
      .project({ password: 0, authToken: 0 })
      .toArray();

    const minseokUserForApi = usersForApi.find(u => u.name === '성민석');
    if (minseokUserForApi) {
      console.log('  _id:', minseokUserForApi._id.toString(), '(string - API에서 변환)');
      console.log('  expertId:', minseokUserForApi.expertId, `(${typeof minseokUserForApi.expertId})`);
    }

    console.log('\n=== 5. 프론트엔드 매칭 로직 시뮬레이션 ===');

    // 전문가 관리 페이지 로직
    console.log('\n[전문가 관리 페이지] linkedUser 찾기:');
    const expertsFormatted = expertsForApi.map(e => ({
      ...e,
      _id: e._id.toString()
    }));

    const usersFormatted = usersForApi.map(u => ({
      ...u,
      _id: u._id.toString()
    }));

    const targetExpert = expertsFormatted.find(e => e.name === '성민석');
    if (targetExpert) {
      console.log('\n검색 대상 전문가:');
      console.log('  expert.userId:', targetExpert.userId, `(${typeof targetExpert.userId})`);

      const linkedUser = usersFormatted.find(u => {
        if (!targetExpert.userId) {
          console.log('  ⚠️ expert.userId가 undefined/null이므로 매칭 실패');
          return false;
        }
        const userId = typeof u._id === 'string' ? u._id : u._id?.toString();
        const matches = userId === targetExpert.userId;

        if (u.name === '성민석') {
          console.log(`\n  성민석 사용자와 비교:`);
          console.log(`    user._id: ${u._id} (${typeof u._id})`);
          console.log(`    userId: ${userId}`);
          console.log(`    expert.userId: ${targetExpert.userId}`);
          console.log(`    매칭 결과: ${matches}`);
        }

        return matches;
      });

      if (linkedUser) {
        console.log('\n✅ linkedUser 찾음:', linkedUser.name, `(${linkedUser.email})`);
      } else {
        console.log('\n❌ linkedUser를 찾을 수 없음');
      }
    }

    console.log('\n=== 6. 디버깅 요약 ===');
    console.log('\n문제 체크리스트:');
    console.log('  [ ] expert.userId가 null/undefined인가?');
    console.log('  [ ] user._id가 제대로 문자열로 변환되는가?');
    console.log('  [ ] 타입 비교가 정확한가? (string === string)');
    console.log('  [ ] 양방향 관계가 올바른가? (user.expertId ↔ expert.userId)');

  } finally {
    await client.close();
  }
}

compareDataStructures().catch(console.error);
