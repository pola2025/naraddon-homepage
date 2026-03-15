import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { buildR2ObjectUrl, getR2Client, isR2Configured } from '@/lib/r2';

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  if (!isR2Configured() || !BUCKET_NAME) {
    return NextResponse.json({ error: 'R2 설정 누락' }, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '10MB 초과' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // WebP 자동 변환 + 압축
    const webpBuffer = await sharp(buffer)
      .webp({ quality: 80 })
      .resize({ width: 720, withoutEnlargement: true })
      .toBuffer();

    const fileName = `shorts/${uuidv4()}.webp`;
    const s3Client = getR2Client();

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: webpBuffer,
        ContentType: 'image/webp',
        CacheControl: 'max-age=31536000',
      })
    );

    const cdnUrl = buildR2ObjectUrl(fileName, BUCKET_NAME);

    return NextResponse.json({
      success: true,
      url: cdnUrl,
      size: webpBuffer.length,
      originalSize: file.size,
    });
  } catch (error) {
    console.error('[shorts/upload] 오류:', error);
    return NextResponse.json({ error: '업로드 실패' }, { status: 500 });
  }
}
