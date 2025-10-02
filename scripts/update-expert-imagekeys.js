const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

// 한글 이름 -> 영문 imageKey 매핑
const expertMapping = {
  '백경우': 'baek-kyung-woo',
  '성민석': 'sung-min-seok',
  '전기홍': 'jeon-ki-hong',
  '최일현': 'choi-il-hyun',
  '황기현': 'hwang-ki-hyun',
  '김재균': 'kim-jae-gyun',
};

async function updateImageKeys() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not set in .env.local');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const expertsCollection = db.collection('experts');

    // 모든 전문가 조회
    const experts = await expertsCollection.find({}).toArray();
    console.log(`\n📋 Found ${experts.length} experts in database\n`);

    for (const expert of experts) {
      const koreanName = expert.name;
      const englishKey = expertMapping[koreanName];

      if (!englishKey) {
        console.log(`⚠️  No mapping found for: ${koreanName}`);
        continue;
      }

      console.log(`Updating: ${koreanName} -> ${englishKey}`);

      const result = await expertsCollection.updateOne(
        { _id: expert._id },
        {
          $set: {
            imageKey: englishKey,
            imageUrl: `https://pub-9f184323b8f24eb28c63d1a1410dd26a.r2.dev/${englishKey}.png`,
          },
        }
      );

      console.log(`  ✅ Updated ${result.modifiedCount} document(s)\n`);
    }

    console.log('\n🎉 All imageKeys updated successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

updateImageKeys();
