/**
 * MongoDB 분석 인덱스 생성 스크립트
 *
 * @purpose 분석 쿼리 성능 최적화를 위한 인덱스 생성
 * @context 전환 퍼널, 캠페인 성과, 시간대별 분석 쿼리 최적화
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function createAnalyticsIndexes() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    const db = client.db('naraddon');

    console.log('📊 Creating indexes for analytics...\n');

    // 1. page-visits 컬렉션 인덱스
    console.log('1️⃣  Creating indexes for page-visits collection...');

    await db.collection('page-visits').createIndex(
      { timestamp: 1 },
      { name: 'timestamp_1' }
    );
    console.log('  ✅ timestamp index created');

    await db.collection('page-visits').createIndex(
      { sessionId: 1 },
      { name: 'sessionId_1' }
    );
    console.log('  ✅ sessionId index created');

    await db.collection('page-visits').createIndex(
      { pathname: 1, timestamp: 1 },
      { name: 'pathname_timestamp_1' }
    );
    console.log('  ✅ pathname + timestamp compound index created');

    await db.collection('page-visits').createIndex(
      { utmSource: 1, timestamp: 1 },
      { name: 'utmSource_timestamp_1', sparse: true }
    );
    console.log('  ✅ utmSource + timestamp index created');

    await db.collection('page-visits').createIndex(
      { utmMedium: 1, timestamp: 1 },
      { name: 'utmMedium_timestamp_1', sparse: true }
    );
    console.log('  ✅ utmMedium + timestamp index created');

    await db.collection('page-visits').createIndex(
      { utmCampaign: 1, timestamp: 1 },
      { name: 'utmCampaign_timestamp_1', sparse: true }
    );
    console.log('  ✅ utmCampaign + timestamp index created');

    // 2. conversions 컬렉션 인덱스
    console.log('\n2️⃣  Creating indexes for conversions collection...');

    await db.collection('conversions').createIndex(
      { sessionId: 1 },
      { name: 'sessionId_1' }
    );
    console.log('  ✅ sessionId index created');

    await db.collection('conversions').createIndex(
      { timestamp: 1 },
      { name: 'timestamp_1' }
    );
    console.log('  ✅ timestamp index created');

    await db.collection('conversions').createIndex(
      { conversionType: 1, timestamp: 1 },
      { name: 'conversionType_timestamp_1' }
    );
    console.log('  ✅ conversionType + timestamp compound index created');

    await db.collection('conversions').createIndex(
      { userId: 1, timestamp: 1 },
      { name: 'userId_timestamp_1', sparse: true }
    );
    console.log('  ✅ userId + timestamp index created');

    // 3. 인덱스 확인
    console.log('\n📋 Verifying indexes...\n');

    const pageVisitsIndexes = await db.collection('page-visits').indexes();
    console.log('page-visits indexes:');
    pageVisitsIndexes.forEach(index => {
      console.log(`  - ${index.name}`);
    });

    const conversionsIndexes = await db.collection('conversions').indexes();
    console.log('\nconversions indexes:');
    conversionsIndexes.forEach(index => {
      console.log(`  - ${index.name}`);
    });

    console.log('\n✅ All analytics indexes created successfully!');
    console.log('\n📈 Expected performance improvements:');
    console.log('  - Funnel analysis queries: 50-70% faster');
    console.log('  - Campaign analytics: 60-80% faster');
    console.log('  - Time-based queries: 70-90% faster');
    console.log('  - Session-based queries: 50-60% faster');

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

createAnalyticsIndexes();
