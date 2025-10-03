const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const ExpertSchema = new mongoose.Schema({
  name: String,
  position: String,
  companyName: String,
  category: String,
  specialties: [String],
  imageUrl: String,
  imageAlt: String,
  sortOrder: Number,
  legacyKey: String,
  isPublished: Boolean,
}, { collection: 'experts' });

const Expert = mongoose.model('Expert', ExpertSchema);

const CLOUDFLARE_R2_BASE = 'https://pub-9f184323b8f24eb28c63d1a1410dd26a.r2.dev';

async function fixImageUrls() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const experts = await Expert.find({ 
      imageUrl: { $regex: '^/images/examiners/' } 
    });

    console.log(`Found ${experts.length} experts with old image URLs`);

    for (const expert of experts) {
      const oldUrl = expert.imageUrl;
      const filename = expert.legacyKey || expert.imageUrl.split('/').pop();
      const newUrl = `${CLOUDFLARE_R2_BASE}/${filename}`;
      
      expert.imageUrl = newUrl;
      await expert.save();
      
      console.log(`✅ Updated ${expert.name}: ${oldUrl} → ${newUrl}`);
    }

    console.log('\n✅ All image URLs updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixImageUrls();
