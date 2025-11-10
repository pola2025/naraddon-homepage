const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function removeJeonCareerAndCases() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set in .env.local');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('naraddon');
    const collection = db.collection('experts');

    // 전기홍 전문가 찾기
    const result = await collection.updateOne(
      { name: '전기홍' },
      {
        $unset: {
          career: '',
          successCases: ''
        }
      }
    );

    if (result.matchedCount === 0) {
      console.log('⚠️  전기홍 전문가를 찾을 수 없습니다.');
    } else if (result.modifiedCount > 0) {
      console.log('✅ 전기홍 전문가의 경력과 성공케이스를 삭제했습니다.');

      // 삭제 후 데이터 확인
      const updated = await collection.findOne({ name: '전기홍' });
      console.log('\n현재 전기홍 데이터:');
      console.log(JSON.stringify(updated, null, 2));
    } else {
      console.log('ℹ️  이미 경력과 성공케이스가 없습니다.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

removeJeonCareerAndCases();
