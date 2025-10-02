require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function deepAnalysis() {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('=== MongoDB 원본 데이터 분석 ===\n');

  // Expert 컬렉션 직접 조회
  const db = mongoose.connection.db;
  const expertsCollection = db.collection('experts');

  const rawExperts = await expertsCollection.find({ isActive: true }).toArray();

  console.log(`총 ${rawExperts.length}명의 활성 전문가\n`);

  rawExperts.forEach((expert, idx) => {
    console.log(`[${idx + 1}] ${expert.name}`);
    console.log(`  _id: ${expert._id}`);
    console.log(`  imageKey: ${expert.imageKey}`);
    console.log(`  imageUrl: ${expert.imageUrl || '(필드 없음)'}`);
    console.log(`  전체 필드: ${Object.keys(expert).join(', ')}`);
    console.log();
  });

  // Mongoose 모델로 조회
  const Expert = mongoose.model('Expert', new mongoose.Schema({}, { strict: false }));
  const modelExperts = await Expert.find({ isActive: true }).select('-__v');

  console.log('\n=== Mongoose 모델로 조회한 데이터 ===\n');
  modelExperts.forEach((expert, idx) => {
    console.log(`[${idx + 1}] ${expert.name}`);
    console.log(`  imageKey: ${expert.imageKey}`);
    console.log(`  imageUrl: ${expert.imageUrl || '(필드 없음)'}`);
    console.log(`  imageUrl 타입: ${typeof expert.imageUrl}`);
    console.log();
  });

  await mongoose.disconnect();
}

deepAnalysis().catch(console.error);
