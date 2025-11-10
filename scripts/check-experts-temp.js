const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkExperts() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('naraddon');
    const experts = await db.collection('experts').find({ isActive: true }).toArray();

    experts.forEach(expert => {
      console.log('\n===========================');
      console.log('Name:', expert.name);
      console.log('Position:', expert.position || 'none');
      console.log('Company:', expert.companyName);
      console.log('Career items:', expert.career ? expert.career.length : 0);
      console.log('ID:', expert._id.toString());
    });
  } finally {
    await client.close();
  }
}

checkExperts();
