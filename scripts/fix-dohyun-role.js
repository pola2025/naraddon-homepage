/**
 * 김도현님 role 수정 스크립트
 *
 * @purpose 배포 전 연결 해제로 인해 role이 'examiner'로 남아있는 김도현님 계정 수정
 * @context 연결이 해제되었지만 role은 'examiner'로 남아있는 상태
 * @usage node scripts/fix-dohyun-role.js
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다.');
  console.error('   .env.local 파일에 MONGODB_URI를 설정해주세요.');
  process.exit(1);
}

async function fixDohyunRole() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔌 MongoDB 연결 중...');
    await client.connect();
    console.log('✅ MongoDB 연결 성공\n');

    const db = client.db('naraddon');
    const usersCollection = db.collection('users');
    const examinersCollection = db.collection('expert-examiners');

    // 1. role='examiner'이면서 examinerId가 없고, 연결된 examiner가 없는 사용자 찾기
    const orphanedExaminers = await usersCollection
      .find({
        role: 'examiner',
        $or: [
          { examinerId: { $exists: false } },
          { examinerId: null }
        ]
      })
      .toArray();

    console.log(`📊 총 ${orphanedExaminers.length}명의 orphaned examiner 발견\n`);

    if (orphanedExaminers.length === 0) {
      console.log('✅ 수정할 사용자가 없습니다.');
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;

    // 2. 각 사용자에 대해 연결된 examiner가 있는지 확인
    for (const user of orphanedExaminers) {
      const { _id, email, name } = user;

      // 이 사용자와 연결된 examiner가 있는지 확인
      const connectedExaminer = await examinersCollection.findOne({
        userId: _id.toString()
      });

      if (connectedExaminer) {
        // 연결된 examiner가 있으면 스킵 (정상 상태)
        console.log(`⏭️  [${name}] 연결된 examiner 있음 - 스킵 (${email})`);
        skippedCount++;
        continue;
      }

      // 연결된 examiner가 없으면 role을 'user'로 변경
      const result = await usersCollection.updateOne(
        { _id },
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
        console.log(`✅ [${name}] role을 'user'로 변경 완료 (${email})`);
        updatedCount++;
      }
    }

    // 3. 결과 요약
    console.log('\n' + '='.repeat(60));
    console.log('📊 수정 완료');
    console.log('='.repeat(60));
    console.log(`총 orphaned examiners: ${orphanedExaminers.length}명`);
    console.log(`✅ 업데이트: ${updatedCount}명`);
    console.log(`⏭️  스킵: ${skippedCount}명 (연결된 examiner 있음)`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ 스크립트 실행 중 오류:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 MongoDB 연결 종료');
  }
}

// 실행
fixDohyunRole()
  .then(() => {
    console.log('✅ 스크립트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실패:', error);
    process.exit(1);
  });
