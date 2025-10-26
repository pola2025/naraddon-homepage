/**
 * 김도현님 데이터 상태 확인 스크립트
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

async function checkDohyunStatus() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('naraddon');

    // 김도현님 찾기 (name 또는 email로)
    const users = await db.collection('users')
      .find({
        $or: [
          { name: /도현/ },
          { email: /dohyun/i }
        ]
      })
      .toArray();

    console.log('='.repeat(60));
    console.log('김도현님 계정 상태');
    console.log('='.repeat(60));

    if (users.length === 0) {
      console.log('❌ 김도현님 계정을 찾을 수 없습니다.');
    } else {
      users.forEach((user, index) => {
        console.log(`\n[${index + 1}] 사용자 정보:`);
        console.log(`  - 이름: ${user.name}`);
        console.log(`  - 이메일: ${user.email}`);
        console.log(`  - Role: ${user.role}`);
        console.log(`  - ExaminerId: ${user.examinerId || '없음'}`);
        console.log(`  - User ID: ${user._id}`);

        // 이 userId와 연결된 examiner가 있는지 확인
        db.collection('expert-examiners')
          .findOne({ userId: user._id.toString() })
          .then(examiner => {
            if (examiner) {
              console.log(`  - 연결된 Examiner: ${examiner.name} (${examiner._id})`);
            } else {
              console.log(`  - 연결된 Examiner: 없음`);
            }
          });
      });
    }

    // 잠시 대기 (비동기 쿼리 완료 대기)
    await new Promise(resolve => setTimeout(resolve, 1000));

  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await client.close();
  }
}

checkDohyunStatus();
