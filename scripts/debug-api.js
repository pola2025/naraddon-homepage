require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const expertSchema = new mongoose.Schema({}, { strict: false });
const Expert = mongoose.model('Expert', expertSchema);

async function debugAPI() {
  await mongoose.connect(process.env.MONGODB_URI);

  const experts = await Expert.find({ isActive: true })
    .sort({ order: 1, createdAt: -1 })
    .select('-__v');

  console.log('=== MongoDB 원본 데이터 ===');
  experts.forEach(expert => {
    console.log(`\n이름: ${expert.name}`);
    console.log(`imageKey: ${expert.imageKey}`);
    console.log(`imageUrl: ${expert.imageUrl}`);
    console.log(`imageUrl 타입: ${typeof expert.imageUrl}`);
    console.log(`imageUrl 존재: ${!!expert.imageUrl}`);
  });

  await mongoose.disconnect();
}

debugAPI();
