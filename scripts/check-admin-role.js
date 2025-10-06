const { MongoClient } = require('mongodb');

async function checkAdminRole() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('naraddon');
    const users = await db.collection('users').find({}).toArray();

    console.log('\n📋 All users:');
    users.forEach(user => {
      console.log(`- Email: ${user.email}`);
      console.log(`  Name: ${user.name || 'N/A'}`);
      console.log(`  Role: ${user.role || 'NO ROLE SET'}`);
      console.log(`  Created: ${user.createdAt || 'N/A'}`);
      console.log('');
    });

    if (users.length === 0) {
      console.log('⚠️  No users found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkAdminRole();
