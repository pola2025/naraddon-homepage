/**
 * Migration Script: 기존 연결된 심사관에게 examinerId 소급 적용
 *
 * @purpose ExpertExaminer와 연결된 User에 examinerId 필드 추가
 * @context 기존 심사관들이 브랜드 페이지 편집 버튼을 사용할 수 있도록
 * @usage node scripts/migrate-examiner-ids.js
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다.');
  console.error('   .env.local 파일에 MONGODB_URI를 설정해주세요.');
  process.exit(1);
}

async function migrateExaminerIds() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔌 MongoDB 연결 중...');
    await client.connect();
    console.log('✅ MongoDB 연결 성공\n');

    const db = client.db('naraddon');
    const usersCollection = db.collection('users');
    const examinersCollection = db.collection('expert-examiners');

    // 1. userId가 있는 모든 ExpertExaminer 조회
    const connectedExaminers = await examinersCollection
      .find({ userId: { $exists: true, $ne: null } })
      .toArray();

    console.log(`📊 총 ${connectedExaminers.length}명의 연결된 심사관 발견\n`);

    if (connectedExaminers.length === 0) {
      console.log('✅ Migration 필요 없음 - 연결된 심사관이 없습니다.');
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 2. 각 심사관에 대해 User 컬렉션 업데이트
    for (const examiner of connectedExaminers) {
      const { _id: examinerId, userId, name, email } = examiner;

      try {
        // User 찾기
        const user = await usersCollection.findOne({
          _id: new ObjectId(userId)
        });

        if (!user) {
          console.log(`⚠️  [${name}] User not found (userId: ${userId})`);
          errorCount++;
          continue;
        }

        // 이미 examinerId가 있으면 스킵
        if (user.examinerId) {
          console.log(`⏭️  [${name}] 이미 examinerId가 설정되어 있음 (${user.email})`);
          skippedCount++;
          continue;
        }

        // examinerId 추가
        const result = await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              examinerId: examinerId.toString(),
              updatedAt: new Date()
            }
          }
        );

        if (result.modifiedCount > 0) {
          console.log(`✅ [${name}] examinerId 추가 완료 (${user.email})`);
          updatedCount++;
        } else {
          console.log(`⚠️  [${name}] 업데이트 실패 (${user.email})`);
          errorCount++;
        }

      } catch (error) {
        console.error(`❌ [${name}] 오류 발생:`, error.message);
        errorCount++;
      }
    }

    // 3. 결과 요약
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration 완료');
    console.log('='.repeat(60));
    console.log(`총 심사관: ${connectedExaminers.length}명`);
    console.log(`✅ 업데이트: ${updatedCount}명`);
    console.log(`⏭️  스킵: ${skippedCount}명 (이미 설정됨)`);
    console.log(`❌ 오류: ${errorCount}명`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Migration 실행 중 오류:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 MongoDB 연결 종료');
  }
}

// 실행
migrateExaminerIds()
  .then(() => {
    console.log('✅ Migration 스크립트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration 스크립트 실패:', error);
    process.exit(1);
  });
