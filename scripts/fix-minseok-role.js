const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function fixMinseokRole() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('naraddon');

    // 성민석 사용자 일반 회원으로 변경
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId('68ff41e9a6c25cf3fa9fcd11') },
      {
        $set: {
          role: 'user',
          updatedAt: new Date()
        },
        $unset: {
          examinerId: '',
          expertId: ''
        }
      }
    );

    console.log('업데이트 결과:', result);

    // 확인
    const user = await db.collection('users').findOne({
      _id: new ObjectId('68ff41e9a6c25cf3fa9fcd11')
    });

    console.log('\n=== 업데이트된 사용자 정보 ===');
    console.log('이름:', user.name);
    console.log('역할:', user.role);
    console.log('examinerId:', user.examinerId || '없음');
    console.log('expertId:', user.expertId || '없음');

  } finally {
    await client.close();
  }
}

fixMinseokRole().catch(console.error);
