const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkUserRole() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('naraddon');

    // 성민석 사용자 찾기
    const user = await db.collection('users').findOne({
      _id: new ObjectId('68ff41e9a6c25cf3fa9fcd11')
    });

    if (!user) {
      console.log('사용자를 찾을 수 없습니다.');
      return;
    }

    console.log('\n=== 성민석 사용자 정보 ===');
    console.log('ID:', user._id.toString());
    console.log('이름:', user.name);
    console.log('이메일:', user.email);
    console.log('역할:', user.role);
    console.log('examinerId:', user.examinerId || '없음');
    console.log('expertId:', user.expertId || '없음');

    // 연결된 심사관 프로필 확인
    if (user.examinerId) {
      const examiner = await db.collection('expert-examiners').findOne({
        _id: new ObjectId(user.examinerId)
      });
      console.log('\n=== 연결된 심사관 프로필 ===');
      console.log(examiner);
    }

    // 연결된 전문가 프로필 확인
    if (user.expertId) {
      const expert = await db.collection('experts').findOne({
        _id: new ObjectId(user.expertId)
      });
      console.log('\n=== 연결된 전문가 프로필 ===');
      console.log(expert);
    }

    // 배정된 상담 확인
    const consultations = await db.collection('consultations').find({
      assignedStaffId: user.email
    }).toArray();

    console.log('\n=== 배정된 상담 ===');
    console.log('총:', consultations.length, '건');
    consultations.forEach(c => {
      console.log(`- ${c.companyName} (상태: ${c.status})`);
    });

  } finally {
    await client.close();
  }
}

checkUserRole().catch(console.error);
