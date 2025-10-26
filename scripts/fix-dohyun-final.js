/**
 * 김도현님 role 수정 (최종)
 *
 * @purpose role을 'user'로 변경하고 examinerId 제거
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

async function fixDohyunFinal() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔌 MongoDB 연결 중...');
    await client.connect();
    console.log('✅ MongoDB 연결 성공\n');

    const db = client.db('naraddon');
    const usersCollection = db.collection('users');

    // 김도현님 ID
    const userId = new ObjectId('68fca314b1b5ec07d22307be');

    // 현재 상태 확인
    const user = await usersCollection.findOne({ _id: userId });

    if (!user) {
      console.log('❌ 사용자를 찾을 수 없습니다.');
      return;
    }

    console.log('📊 현재 상태:');
    console.log(`  - 이름: ${user.name}`);
    console.log(`  - 이메일: ${user.email}`);
    console.log(`  - Role: ${user.role}`);
    console.log(`  - ExaminerId: ${user.examinerId || '없음'}\n`);

    // role을 'user'로 변경하고 examinerId 제거
    const result = await usersCollection.updateOne(
      { _id: userId },
      {
        $set: {
          role: 'user',
          updatedAt: new Date()
        },
        $unset: {
          examinerId: ''
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ 수정 완료!\n');

      // 수정 후 상태 확인
      const updatedUser = await usersCollection.findOne({ _id: userId });
      console.log('📊 수정 후 상태:');
      console.log(`  - Role: ${updatedUser.role}`);
      console.log(`  - ExaminerId: ${updatedUser.examinerId || '없음'}`);
    } else {
      console.log('⚠️  변경사항 없음 (이미 올바른 상태)');
    }

  } catch (error) {
    console.error('❌ 오류:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 MongoDB 연결 종료');
  }
}

fixDohyunFinal()
  .then(() => {
    console.log('✅ 스크립트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실패:', error);
    process.exit(1);
  });
