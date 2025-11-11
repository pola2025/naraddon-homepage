const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('naraddon');

    // 성민석 전문가 프로필
    const expert = await db.collection('experts').findOne({
      name: '성민석'
    });

    console.log('\n=== 성민석 전문가 프로필 ===');
    console.log('_id:', expert._id.toString());
    console.log('userId:', expert.userId);

    // userId로 사용자 찾기 (문자열로)
    const userByString = await db.collection('users').findOne({
      _id: expert.userId
    });

    console.log('\n=== userId로 사용자 검색 (문자열) ===');
    console.log('검색 조건: _id = expert.userId (문자열)');
    console.log('expert.userId 타입:', typeof expert.userId);
    console.log('expert.userId 값:', expert.userId);
    console.log('찾은 사용자:', userByString ? userByString.name : '없음');

    // ObjectId로 변환해서 찾기
    const { ObjectId } = require('mongodb');
    const userByObjectId = await db.collection('users').findOne({
      _id: new ObjectId(expert.userId)
    });

    console.log('\n=== userId로 사용자 검색 (ObjectId) ===');
    console.log('검색 조건: _id = new ObjectId(expert.userId)');
    console.log('찾은 사용자:', userByObjectId ? userByObjectId.name : '없음');

    // expertId로 사용자 찾기
    const userByExpertId = await db.collection('users').findOne({
      expertId: expert._id.toString()
    });

    console.log('\n=== expertId로 사용자 검색 ===');
    console.log('검색 조건: expertId = expert._id.toString()');
    console.log('찾은 사용자:', userByExpertId ? userByExpertId.name : '없음');

    // 모든 users의 _id 타입 확인
    const allUsers = await db.collection('users').find({}).limit(3).toArray();
    console.log('\n=== Users _id 샘플 ===');
    allUsers.forEach(u => {
      console.log('- name:', u.name, '/ _id:', u._id.toString(), '/ expertId:', u.expertId || '없음');
    });

  } finally {
    await client.close();
  }
}

testConnection().catch(console.error);
