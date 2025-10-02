require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function removeImageUrlField() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const db = mongoose.connection.db;
  const result = await db.collection('experts').updateMany(
    {},
    { $unset: { imageUrl: "" } }
  );
  
  console.log(`Updated ${result.modifiedCount} documents - removed imageUrl field`);
  
  const experts = await db.collection('experts').find({ isActive: true }).toArray();
  experts.forEach(e => {
    console.log(`${e.name}: imageUrl = ${e.imageUrl || '(removed)'}`);
  });
  
  await mongoose.disconnect();
}

removeImageUrlField().catch(console.error);
