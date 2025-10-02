require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const expertSchema = new mongoose.Schema({}, { strict: false });
const Expert = mongoose.model('Expert', expertSchema);

async function checkData() {
  await mongoose.connect(process.env.MONGODB_URI);
  const experts = await Expert.find({}).select('name imageKey imageUrl');
  console.log(JSON.stringify(experts, null, 2));
  await mongoose.disconnect();
}

checkData();
