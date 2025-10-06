require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkUserRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const users = await db.collection('users').find({}).toArray();

    console.log('\n=== All Users ===\n');
    users.forEach(user => {
      console.log('Email:', user.email);
      console.log('Name:', user.name || 'N/A');
      console.log('Role:', user.role || 'NO ROLE SET');
      console.log('Provider:', user.provider || 'N/A');
      console.log('Created:', user.createdAt || 'N/A');
      console.log('---');
    });

    if (users.length === 0) {
      console.log('No users found in database');
    } else {
      console.log(`\nTotal users: ${users.length}`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUserRoles();
