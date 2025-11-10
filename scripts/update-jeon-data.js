const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function updateJeonData() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('naraddon');
    const experts = db.collection('experts');

    const result = await experts.updateOne(
      { _id: new ObjectId('68d00d0db18b2f31b7860be1') },
      {
        $set: {
          career: [
            '창성 행정사 사무소 대표 (2015년 ~ 현재)',
            '중소기업 인허가 컨설팅 전문가',
            '건설업 및 제조업 인허가 1,000건 이상 처리',
            '서울시 중소기업 인허가 지원사업 자문위원',
            '행정사 자격 취득 (2012년)'
          ],
          updatedAt: new Date()
        }
      }
    );

    console.log('Updated:', result.modifiedCount, 'documents');
    console.log('Successfully added career data for 전기홍 행정사');
  } finally {
    await client.close();
  }
}

updateJeonData();
