import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkAllAdmins() {
  const client = new MongoClient(process.env.MONGODB_URI!);

  try {
    await client.connect();
    const db = client.db();

    // 모든 admin 및 super_admin 계정 조회
    const admins = await db.collection('users').find({
      role: { $in: ['admin', 'super_admin'] }
    }).toArray();

    console.log('========================================');
    console.log('총 관리자 계정 수:', admins.length);
    console.log('========================================\n');

    let idx = 1;
    for (const admin of admins) {
      console.log(`[${idx}] ${admin.name} (${admin.email})`);
      console.log(`    Role: ${admin.role}`);
      console.log(`    Role Type: ${typeof admin.role}`);
      console.log(`    _id: ${admin._id}`);
      console.log('');
      idx++;
    }

    // 모든 examiner 계정도 확인
    const examiners = await db.collection('users').find({
      role: 'examiner'
    }).toArray();

    console.log('========================================');
    console.log('총 기업심사관 계정 수:', examiners.length);
    console.log('========================================\n');

    idx = 1;
    for (const examiner of examiners) {
      console.log(`[${idx}] ${examiner.name} (${examiner.email})`);
      console.log(`    Role: ${examiner.role}`);
      console.log('');
      idx++;
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkAllAdmins();
