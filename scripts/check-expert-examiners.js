const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const expertExaminerSchema = new mongoose.Schema({
  name: String,
  position: String,
  companyName: String,
  category: String,
  specialties: [String],
  imageUrl: String,
  imageAlt: String,
  sortOrder: Number,
  legacyKey: String,
  isPublished: Boolean
}, { collection: 'expertexaminers' });

const ExpertExaminer = mongoose.models.ExpertExaminer || mongoose.model('ExpertExaminer', expertExaminerSchema);

async function checkExpertExaminers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB 연결 성공');

    const examiners = await ExpertExaminer.find({}).lean();
    console.log(`총 ${examiners.length}명의 ExpertExaminer 데이터:`)

    examiners.forEach(e => {
      console.log(`- ${e.name} (ID: ${e._id}, legacyKey: ${e.legacyKey})`);
    });

  } catch (error) {
    console.error('에러 발생:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB 연결 종료');
  }
}

checkExpertExaminers();