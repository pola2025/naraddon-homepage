const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function clearDummyData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Clear dummy data from collections
    const collections = [
      'ttontokposts',
      'ttontokreplies',
      'policynewsposts',
      'businessvoiceinterviewvideos',
      'naraddontubeentries',
      'ddontalks'
    ];

    for (const collectionName of collections) {
      const result = await db.collection(collectionName).deleteMany({});
      console.log(`Cleared ${result.deletedCount} documents from ${collectionName}`);
    }

    console.log('✅ All dummy data cleared successfully');
    await mongoose.connection.close();

  } catch (error) {
    console.error('Error clearing dummy data:', error.message);
    process.exit(1);
  }
}

clearDummyData();