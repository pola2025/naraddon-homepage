/**
 * 김지완, 김도현 심사관 이메일 연결 수정
 *
 * @purpose expert-examiners 컬렉션에 이메일 추가하여 권한 체크 가능하도록 수정
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

async function fixExaminerEmails() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('naraddon');

    console.log('🔧 심사관 이메일 연결 수정 시작\n');

    // 수정할 심사관 목록
    const updates = [
      {
        name: '김지완',
        examinerId: '68e8c5900c9048f3d9115276',
        email: 'kyjkyj4465@naver.com'
      },
      {
        name: '김도현',
        examinerId: '68f1dcdf4ec3ea9b88ebc32d',
        email: 'govkr_kdh@naver.com'
      }
    ];

    for (const update of updates) {
      console.log(`📝 ${update.name} 수정 중...`);

      // 1. 기존 데이터 확인
      const before = await db.collection('expert-examiners').findOne({
        _id: new ObjectId(update.examinerId)
      });

      if (!before) {
        console.log(`  ❌ ${update.name}을 찾을 수 없습니다.`);
        continue;
      }

      console.log(`  현재 이메일: ${before.email || '없음'}`);

      // 2. 이메일 업데이트
      const result = await db.collection('expert-examiners').updateOne(
        { _id: new ObjectId(update.examinerId) },
        {
          $set: {
            email: update.email,
            updatedAt: new Date()
          }
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`  ✅ 이메일 업데이트 완료: ${update.email}`);
      } else {
        console.log(`  ⚠️ 업데이트되지 않음 (이미 동일한 이메일일 수 있음)`);
      }

      // 3. 업데이트 확인
      const after = await db.collection('expert-examiners').findOne({
        _id: new ObjectId(update.examinerId)
      });

      console.log(`  확인: ${after.email}`);
      console.log('');
    }

    console.log('✅ 모든 심사관 이메일 업데이트 완료\n');

    // 4. 검증: 이메일로 검색 가능한지 확인
    console.log('🔍 검증: 이메일로 검색 테스트\n');

    for (const update of updates) {
      const found = await db.collection('expert-examiners').findOne({
        email: update.email
      });

      if (found) {
        console.log(`✅ ${update.name}: 이메일로 검색 성공`);
        console.log(`   이메일: ${found.email}`);
        console.log(`   이름: ${found.name}`);
        console.log('');
      } else {
        console.log(`❌ ${update.name}: 이메일로 검색 실패`);
        console.log('');
      }
    }

    console.log('🎉 완료! 이제 김지완, 김도현 계정으로 브랜드 페이지 수정 가능합니다.');

  } catch (error) {
    console.error('❌ 에러:', error);
  } finally {
    await client.close();
  }
}

fixExaminerEmails();
