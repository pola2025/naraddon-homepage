require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkProductionMongo() {
  const uri = process.env.MONGODB_URI;
  console.log('Connecting to:', uri.replace(/:[^:@]+@/, ':***@'));
  
  await mongoose.connect(uri);
  
  const db = mongoose.connection.db;
  const expertsCollection = db.collection('experts');
  
  const experts = await expertsCollection.find({ isActive: true }).toArray();
  
  console.log('\n=== PRODUCTION MongoDB 데이터 ===\n');
  experts.forEach((expert, idx) => {
    console.log(`[${idx + 1}] ${expert.name}`);
    console.log(`  imageKey: ${expert.imageKey}`);
    console.log(`  imageUrl: ${expert.imageUrl || '(필드 없음)'}`);
    console.log(`  _id: ${expert._id}`);
    console.log();
  });
  
  await mongoose.disconnect();
}

checkProductionMongo().catch(console.error);
