require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function checkExaminerData() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('naraddon');

    // 김태은 심사관 정보 확인
    console.log('=== 김태은 심사관 전체 데이터 ===');
    const examiner = await db.collection('expert-examiners').findOne({
      name: '김태은'
    });

    if (examiner) {
      console.log('_id:', examiner._id);
      console.log('name:', examiner.name);
      console.log('legacyKey:', examiner.legacyKey);
      console.log('companyName:', examiner.companyName);
      console.log('isPublished:', examiner.isPublished);

      // certified-examiners API가 반환하는 데이터 시뮬레이션
      console.log('\n=== API 응답 시뮬레이션 ===');
      const apiResponse = {
        _id: examiner._id.toString(),
        name: examiner.name,
        legacyKey: examiner.legacyKey,
        companyName: examiner.companyName,
      };
      console.log(JSON.stringify(apiResponse, null, 2));

      // 정책분석 글 확인
      console.log('\n=== 정책분석 글 확인 ===');

      // legacyKey로 검색
      if (examiner.legacyKey) {
        const postsByKey = await db.collection('policyanalysisposts').find({
          'examiner.key': examiner.legacyKey
        }).toArray();
        console.log('examiner.key =', examiner.legacyKey, ':', postsByKey.length, '개');
        if (postsByKey.length > 0) {
          console.log('첫 번째 글:', postsByKey[0].title);
        }
      }

      // name으로 검색
      const postsByName = await db.collection('policyanalysisposts').find({
        'examiner.name': examiner.name
      }).toArray();
      console.log('examiner.name =', examiner.name, ':', postsByName.length, '개');
      if (postsByName.length > 0) {
        console.log('첫 번째 글:', postsByName[0].title);
      }

    } else {
      console.log('김태은 심사관을 찾을 수 없습니다.');
    }

  } finally {
    await client.close();
  }
}

checkExaminerData().catch(console.error);
