const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');

// R2 Configuration from environment variables
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET || 'naraddon-assets';

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('❌ Missing R2 credentials in environment variables');
  console.error('Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
  process.exit(1);
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const expertImages = [
  'baek-kyung-woo.png',
  'sung-min-seok.png',
  'jeon-ki-hong.png',
  'choi-il-hyun.png',
];

async function uploadImageToR2(filename) {
  const filePath = path.join(__dirname, '..', 'public', 'pro', filename);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }

  try {
    const fileContent = fs.readFileSync(filePath);

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filename,
      Body: fileContent,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await s3Client.send(command);
    console.log(`✅ Uploaded: ${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to upload ${filename}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting expert images upload to R2...\n');

  const results = await Promise.all(
    expertImages.map(filename => uploadImageToR2(filename))
  );

  const successCount = results.filter(Boolean).length;
  const failCount = results.length - successCount;

  console.log(`\n📊 Upload Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`\n🔗 Images will be available at:`);
  console.log(`   https://pub-9f184323b8f24eb28c63d1a1410dd26a.r2.dev/[filename]`);
}

main().catch(error => {
  console.error('❌ Upload failed:', error);
  process.exit(1);
});
