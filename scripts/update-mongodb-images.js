const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const ExpertSchema = new mongoose.Schema({}, { collection: 'experts', strict: false });
const Expert = mongoose.model('Expert', ExpertSchema);

const CLOUDFLARE_R2_BASE = 'https://pub-9f184323b8f24eb28c63d1a1410dd26a.r2.dev';

async function updateImages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const updates = [
      { name: '백경우', file: 'baek-kyung-woo.png' },
      { name: '성민석', file: 'sung-min-seok.png' },
      { name: '전기홍', file: 'jeon-ki-hong.png' },
      { name: '최일현', file: 'choi-il-hyun.png' },
    ];

    for (const { name, file } of updates) {
      const result = await Expert.updateOne(
        { name },
        { $set: { imageUrl: `${CLOUDFLARE_R2_BASE}/${file}` } }
      );
      console.log(`✅ Updated ${name}: ${result.modifiedCount} document(s)`);
    }

    console.log('\n✅ All MongoDB data updated!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateImages();
