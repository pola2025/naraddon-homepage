import clientPromise from '../lib/mongodb-client';

async function checkUserRole() {
  try {
    const client = await clientPromise;
    const db = client.db('naraddon');
    
    // Find user by email
    const user = await db.collection('users').findOne(
      { email: 'framei@naver.com' },
      { projection: { email: 1, name: 1, role: 1, createdAt: 1, lastLoginAt: 1, updatedAt: 1 } }
    );
    
    console.log('=== User Role Check for framei@naver.com ===');
    if (!user) {
      console.log('❌ User not found in database!');
      process.exit(1);
    }
    
    console.log('Email:', user.email);
    console.log('Name:', user.name);
    console.log('Role:', user.role);
    console.log('Role Type:', typeof user.role);
    console.log('Created:', user.createdAt);
    console.log('Updated:', user.updatedAt);
    console.log('Last Login:', user.lastLoginAt);
    console.log('\n=== Verification ===');
    console.log('Is admin?', user.role === 'admin');
    console.log('Is super_admin?', user.role === 'super_admin');
    console.log('Permission Check (admin || super_admin):', user.role === 'admin' || user.role === 'super_admin');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  process.exit(0);
}

checkUserRole();
