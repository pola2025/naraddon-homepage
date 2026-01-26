/**
 * 팝업 이미지 R2 업로드 스크립트
 *
 * @purpose 이미지를 webp로 변환하고 R2에 업로드
 * @usage node scripts/upload-popup-to-r2.js <input-file> <output-name>
 * @example node scripts/upload-popup-to-r2.js public/popup/broker-warning.png popup-broker-warning
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const fs = require('fs');

// R2 Configuration
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET || 'naraddon-assets';
const R2_PUBLIC_URL = 'https://pub-9f184323b8f24eb28c63d1a1410dd26a.r2.dev';

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('❌ Missing R2 credentials in environment variables');
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

async function convertAndUpload(inputPath, outputName) {
  const fullInputPath = path.isAbsolute(inputPath)
    ? inputPath
    : path.join(__dirname, '..', inputPath);

  if (!fs.existsSync(fullInputPath)) {
    console.error(`❌ File not found: ${fullInputPath}`);
    process.exit(1);
  }

  console.log(`📂 Input: ${fullInputPath}`);

  try {
    // WebP로 변환 (품질 80, 10-30KB 목표)
    const webpBuffer = await sharp(fullInputPath)
      .webp({
        quality: 75,  // 품질 조절로 10-30KB 목표
        effort: 6     // 압축 레벨 (0-6, 높을수록 작은 파일)
      })
      .toBuffer();

    const fileSizeKB = (webpBuffer.length / 1024).toFixed(2);
    console.log(`📦 Converted to WebP: ${fileSizeKB}KB`);

    // 파일 크기 확인 (30KB 초과 시 재압축)
    let finalBuffer = webpBuffer;
    if (webpBuffer.length > 30 * 1024) {
      console.log('⚠️ File > 30KB, reducing quality...');
      finalBuffer = await sharp(fullInputPath)
        .webp({ quality: 60, effort: 6 })
        .toBuffer();
      console.log(`📦 Re-compressed: ${(finalBuffer.length / 1024).toFixed(2)}KB`);
    }

    // R2에 업로드
    const r2Key = `popup/${outputName}.webp`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: r2Key,
      Body: finalBuffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await s3Client.send(command);

    const publicUrl = `${R2_PUBLIC_URL}/${r2Key}`;
    console.log(`\n✅ Upload successful!`);
    console.log(`🔗 URL: ${publicUrl}`);
    console.log(`\n📋 Copy for code:`);
    console.log(`   "${publicUrl}"`);

    return publicUrl;
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// CLI 실행
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node upload-popup-to-r2.js <input-file> <output-name>');
  console.log('Example: node upload-popup-to-r2.js public/popup/image.png popup-broker-warning');
  process.exit(1);
}

convertAndUpload(args[0], args[1]);
