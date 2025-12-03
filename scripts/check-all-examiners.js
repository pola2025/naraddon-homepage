/**
 * 전체 심사관 userId 연결 상태 확인 스크립트
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

async function checkAllExaminers() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('naraddon');

  // 모든 심사관 조회
  const examiners = await db.collection('expert-examiners').find({}).toArray();

  console.log('=== 전체 심사관 userId 연결 상태 ===\n');

  let noUserId = [];

  for (const ex of examiners) {
    let email = null;

    if (ex.userId) {
      try {
        const user = await db.collection('users').findOne({
          _id: new ObjectId(ex.userId)
        });
        email = user?.email || null;
      } catch (e) {}
    }

    const status = ex.userId ? '✅' : '❌';
    console.log(status, ex.name, '|', ex.companyName);
    console.log('   userId:', ex.userId || 'NULL');
    console.log('   email:', email || '조회 불가');
    console.log('');

    if (!ex.userId) {
      noUserId.push({ _id: ex._id.toString(), name: ex.name, companyName: ex.companyName });
    }
  }

  console.log('=== userId 없는 심사관 목록 ===');
  console.log(JSON.stringify(noUserId, null, 2));

  await client.close();
}

checkAllExaminers();
