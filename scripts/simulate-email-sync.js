/**
 * 이메일 동기화 로직 시뮬레이션
 *
 * @purpose PUT /api/admin/examiners/[id] 수정 시 이메일 동기화가 제대로 작동하는지 시뮬레이션
 * @usage node scripts/simulate-email-sync.js
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

async function simulateEmailSync() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('naraddon');

    console.log('🔄 이메일 동기화 로직 시뮬레이션\n');
    console.log('='.repeat(70));

    // 테스트 케이스 1: 김지완
    const examinerName1 = '김지완';
    const examiner1 = await db.collection('expert-examiners').findOne({ name: examinerName1 });

    if (!examiner1) {
      console.log(`\n❌ ${examinerName1}을 찾을 수 없습니다.`);
    } else {
      console.log(`\n📋 테스트 케이스 1: ${examinerName1}`);
      console.log(`   심사관 ID: ${examiner1._id}`);
      console.log(`   현재 이메일: ${examiner1.email || '없음'}`);
      console.log(`   userId: ${examiner1.userId || '없음'}`);

      if (examiner1.userId) {
        const user1 = await db.collection('users').findOne({ _id: new ObjectId(examiner1.userId) });

        if (user1) {
          console.log(`\n   ✅ users 컬렉션에서 찾음:`);
          console.log(`      이름: ${user1.name}`);
          console.log(`      이메일: ${user1.email}`);
          console.log(`      역할: ${user1.role}`);

          if (user1.email === examiner1.email) {
            console.log(`\n   ✅ 이메일 일치! 동기화 필요 없음`);
          } else {
            console.log(`\n   🔧 이메일 불일치 감지!`);
            console.log(`      현재: ${examiner1.email || '없음'}`);
            console.log(`      동기화 후: ${user1.email}`);
            console.log(`\n   💡 PUT API 호출 시 자동으로 "${user1.email}"로 동기화됩니다.`);
          }
        } else {
          console.log(`\n   ❌ userId ${examiner1.userId}에 해당하는 사용자를 찾을 수 없습니다.`);
        }
      } else {
        console.log(`\n   ⚠️ userId가 없어서 동기화 불가`);
      }
    }

    console.log('\n' + '='.repeat(70));

    // 테스트 케이스 2: 김도현
    const examinerName2 = '김도현';
    const examiner2 = await db.collection('expert-examiners').findOne({ name: examinerName2 });

    if (!examiner2) {
      console.log(`\n❌ ${examinerName2}을 찾을 수 없습니다.`);
    } else {
      console.log(`\n📋 테스트 케이스 2: ${examinerName2}`);
      console.log(`   심사관 ID: ${examiner2._id}`);
      console.log(`   현재 이메일: ${examiner2.email || '없음'}`);
      console.log(`   userId: ${examiner2.userId || '없음'}`);

      if (examiner2.userId) {
        const user2 = await db.collection('users').findOne({ _id: new ObjectId(examiner2.userId) });

        if (user2) {
          console.log(`\n   ✅ users 컬렉션에서 찾음:`);
          console.log(`      이름: ${user2.name}`);
          console.log(`      이메일: ${user2.email}`);
          console.log(`      역할: ${user2.role}`);

          if (user2.email === examiner2.email) {
            console.log(`\n   ✅ 이메일 일치! 동기화 필요 없음`);
          } else {
            console.log(`\n   🔧 이메일 불일치 감지!`);
            console.log(`      현재: ${examiner2.email || '없음'}`);
            console.log(`      동기화 후: ${user2.email}`);
            console.log(`\n   💡 PUT API 호출 시 자동으로 "${user2.email}"로 동기화됩니다.`);
          }
        } else {
          console.log(`\n   ❌ userId ${examiner2.userId}에 해당하는 사용자를 찾을 수 없습니다.`);
        }
      } else {
        console.log(`\n   ⚠️ userId가 없어서 동기화 불가`);
      }
    }

    console.log('\n' + '='.repeat(70));

    console.log('\n💡 수정된 PUT API 로직:');
    console.log(`
1. 관리자가 심사관 정보 수정 시 userId 전달
2. userId가 있으면:
   - users 컬렉션에서 해당 사용자 조회
   - 사용자의 이메일을 가져와서
   - expert-examiners.email 필드에 자동 동기화
3. 이제 권한 체크가 정상 작동함:
   - session.user.email로 expert-examiners 조회 가능
   - 본인 브랜드 페이지 수정 가능
`);

    console.log('='.repeat(70));

    console.log('\n🎯 다음 단계:');
    console.log('1. 빌드 완료 확인');
    console.log('2. Git 커밋 및 푸시');
    console.log('3. Vercel 배포');
    console.log('4. 프로덕션에서 김지완, 김도현 계정으로 브랜드 페이지 수정 테스트');

  } catch (error) {
    console.error('❌ 에러:', error);
  } finally {
    await client.close();
  }
}

simulateEmailSync();
