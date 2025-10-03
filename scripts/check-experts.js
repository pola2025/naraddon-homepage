const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const ExpertSchema = new mongoose.Schema({}, { collection: 'experts', strict: false });
const Expert = mongoose.model('Expert', ExpertSchema);

async function checkExperts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const experts = await Expert.find({}).limit(5);
    console.log(`Found ${experts.length} experts:\n`);
    
    experts.forEach(expert => {
      console.log(`Name: ${expert.name}`);
      console.log(`ImageURL: ${expert.imageUrl}`);
      console.log(`LegacyKey: ${expert.legacyKey}`);
      console.log('---');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkExperts();
