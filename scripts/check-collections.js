require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkCollections() {
  await mongoose.connect(process.env.MONGODB_URI);

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('사용 가능한 컬렉션:');
  collections.forEach(col => console.log(`- ${col.name}`));

  const Expert = mongoose.model('Expert', new mongoose.Schema({}, { strict: false }));
  const count = await Expert.countDocuments();
  console.log(`\nExperts 컬렉션 문서 수: ${count}`);

  const experts = await Expert.find().limit(5).select('name imageUrl');
  console.log('\nExperts 샘플 데이터:');
  experts.forEach(e => console.log(`${e.name}: ${e.imageUrl || '(imageUrl 없음)'}`));

  await mongoose.disconnect();
}

checkCollections();
