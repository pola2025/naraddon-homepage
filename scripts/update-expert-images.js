// MongoDB 전문가 이미지 URL 업데이트 스크립트
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const CLOUDFLARE_BASE = 'https://pub-9f184323b8f24eb28c63d1a1410dd26a.r2.dev';

const expertSchema = new mongoose.Schema({}, { strict: false });
const Expert = mongoose.model('Expert', expertSchema);

const imageMapping = {
  'baek-kyung-woo': `${CLOUDFLARE_BASE}/baek-kyung-woo.png`,
  'sung-min-seok': `${CLOUDFLARE_BASE}/sung-min-seok.png`,
  'jeon-ki-hong': `${CLOUDFLARE_BASE}/jeon-ki-hong.png`,
  'choi-il-hyun': `${CLOUDFLARE_BASE}/choi-il-hyun.png`
};

async function updateExpertImages() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB 연결 성공');

    for (const [imageKey, imageUrl] of Object.entries(imageMapping)) {
      const result = await Expert.updateOne(
        { imageKey },
        { $set: { imageUrl } }
      );
      console.log(`${imageKey}: ${result.modifiedCount}개 업데이트됨`);
    }

    console.log('모든 이미지 URL 업데이트 완료');
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await mongoose.disconnect();
  }
}

updateExpertImages();
