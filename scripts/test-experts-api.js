const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function testExpertsAPI() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('naraddon');

    // 관리자 사용자 확인
    const admin = await db.collection('users').findOne({ 
      role: 'admin' 
    });

    console.log('\n=== 관리자 정보 ===');
    if (admin) {
      console.log('이메일:', admin.email);
      console.log('역할:', admin.role);
    } else {
      console.log('관리자를 찾을 수 없습니다.');
    }

    // 전문가 목록 확인
    const experts = await db.collection('experts')
      .find({})
      .sort({ name: 1 })
      .toArray();

    console.log('\n=== 전문가 목록 ===');
    console.log('총:', experts.length, '명');
    experts.forEach(e => {
      console.log(`- ${e.name} (${e.companyName}) [ID: ${e._id}]`);
    });

  } finally {
    await client.close();
  }
}

testExpertsAPI().catch(console.error);
