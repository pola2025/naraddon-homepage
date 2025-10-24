require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function checkPublishedStatus() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('naraddon');

    console.log('=== 모든 심사관의 isPublished 상태 확인 ===\n');

    const examiners = await db.collection('expert-examiners').find({}).toArray();

    examiners.forEach(examiner => {
      console.log(`이름: ${examiner.name}`);
      console.log(`_id: ${examiner._id}`);
      console.log(`isPublished: ${examiner.isPublished}`);
      console.log(`타입: ${typeof examiner.isPublished}`);
      console.log('---');
    });

    console.log(`\n총 ${examiners.length}명의 심사관`);
    console.log(`공개: ${examiners.filter(e => e.isPublished === true).length}명`);
    console.log(`비공개: ${examiners.filter(e => e.isPublished === false).length}명`);
    console.log(`undefined: ${examiners.filter(e => e.isPublished === undefined).length}명`);

  } finally {
    await client.close();
  }
}

checkPublishedStatus().catch(console.error);
