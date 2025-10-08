require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function checkExaminers() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ MongoDB 연결 성공');

    const db = client.db('naraddon');
    const examiners = await db.collection('expert-examiners')
      .find({})
      .sort({ sortOrder: 1 })
      .toArray();

    console.log(`\n📊 총 심사관 수: ${examiners.length}명\n`);

    if (examiners.length === 0) {
      console.log('⚠️  등록된 심사관 데이터가 없습니다.\n');
    } else {
      console.log('인증 기업심사관 목록:\n');
      examiners.forEach((examiner, index) => {
        console.log(`${index + 1}. ${examiner.name} - ${examiner.position}`);
        console.log(`   회사: ${examiner.companyName || '없음'}`);
        console.log(`   카테고리: ${examiner.category || '없음'}`);
        console.log(`   전문분야: ${examiner.specialties?.join(', ') || '없음'}`);
        console.log(`   userId: ${examiner.userId || '미연결'}`);
        console.log(`   공개여부: ${examiner.isPublished ? '공개' : '비공개'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ 에러 발생:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB 연결 종료');
  }
}

checkExaminers();
