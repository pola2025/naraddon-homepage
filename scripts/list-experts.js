const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function listExperts() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('naraddon');

    const experts = await db.collection('experts').find({}).toArray();

    console.log('\n=== 전문가 목록 ===');
    console.log('총:', experts.length, '명\n');

    experts.forEach(expert => {
      console.log('ID:', expert._id.toString());
      console.log('이름:', expert.name);
      console.log('회사:', expert.companyName);
      console.log('userId:', expert.userId || '없음');
      console.log('---');
    });

  } finally {
    await client.close();
  }
}

listExperts().catch(console.error);
