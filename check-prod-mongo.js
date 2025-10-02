require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const experts = await db.collection('experts').find({ isActive: true }).toArray();
  
  experts.forEach((e, i) => {
    console.log(\);
    console.log(\);
    console.log(\);
    console.log();
  });
  
  await mongoose.disconnect();
}

check().catch(console.error);
