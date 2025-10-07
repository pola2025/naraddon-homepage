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
    
    const db = client.db('naraddon');
    const users = await db.collection('users').find({}).toArray();

        users.forEach(user => {
                                  });

    if (users.length === 0) {
          }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkAdminRole();
