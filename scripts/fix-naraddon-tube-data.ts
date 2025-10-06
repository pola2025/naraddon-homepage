import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set');
  process.exit(1);
}

async function fixNaraddonTubeData() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('naraddon');
    const collection = db.collection('naraddontubeentries');

    // 1. 현재 데이터 확인
    const allEntries = await collection.find({}).toArray();
    console.log('\n=== Current Data ===');
    allEntries.forEach((entry: any, i: number) => {
      console.log(`Entry ${i + 1}:`, {
        _id: entry._id,
        videosCount: entry.videos?.length || 0,
        isPublished: entry.isPublished
      });
    });

    // 2. 빈 videos 배열을 가진 엔트리 삭제
    const deleteResult = await collection.deleteMany({
      $or: [
        { videos: { $size: 0 } },
        { videos: { $exists: false } },
        { videos: null }
      ]
    });
    console.log(`\n✓ Deleted ${deleteResult.deletedCount} entries with empty videos array`);

    // 3. videos 배열이 2개 이상인 엔트리 찾기
    const multiVideoEntries = await collection.find({
      'videos.1': { $exists: true }
    }).toArray();

    console.log(`\n✓ Found ${multiVideoEntries.length} entries with multiple videos`);

    // 4. 각 영상을 독립된 엔트리로 분리
    for (const entry of multiVideoEntries) {
      console.log(`\nProcessing entry ${entry._id}...`);

      for (let i = 0; i < entry.videos.length; i++) {
        const video = entry.videos[i];

        const newEntry = {
          videos: [video],
          isPublished: entry.isPublished ?? true,
          sortOrder: entry.sortOrder ?? 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await collection.insertOne(newEntry);
        console.log(`  ✓ Created new entry for: ${video.title}`);
      }

      // 원본 엔트리 삭제
      await collection.deleteOne({ _id: entry._id });
      console.log(`  ✓ Deleted original entry ${entry._id}`);
    }

    // 5. 최종 결과 확인
    const finalEntries = await collection.find({}).sort({ sortOrder: 1, createdAt: -1 }).toArray();
    console.log('\n=== Final Data ===');
    finalEntries.forEach((entry: any, i: number) => {
      console.log(`Entry ${i + 1}:`, {
        _id: entry._id,
        title: entry.videos?.[0]?.title,
        videosCount: entry.videos?.length || 0,
        isPublished: entry.isPublished
      });
    });

    console.log('\n✅ Data migration completed successfully!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

fixNaraddonTubeData();
