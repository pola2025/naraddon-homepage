import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * POST /api/examiner/brand/upload-info-image
 *
 * @purpose 브랜드 페이지 정보 이미지 업로드 및 자동 압축
 * @context 심사관이 브랜드 정보 이미지를 업로드 (최대 10MB)
 * @decision
 *   - Sharp로 이미지 자동 압축 (품질 80%)
 *   - 최대 너비 1200px로 리사이즈 (비율 유지)
 *   - Cloudflare R2 업로드
 *   - Examiner 권한만 허용
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_WIDTH = 1200; // 최대 너비

// 환경변수 검증
function validateEnvironmentVariables(): { isValid: boolean; missingVars: string[] } {
  const requiredEnvVars = [
    'CLOUDFLARE_R2_ENDPOINT',
    'CLOUDFLARE_R2_ACCESS_KEY_ID',
    'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    'CLOUDFLARE_R2_BUCKET',
    'CLOUDFLARE_R2_PUBLIC_DOMAIN'
  ];

  const missingVars: string[] = [];

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (!value || value.trim() === '') {
      missingVars.push(envVar);
    }
  }

  return { isValid: missingVars.length === 0, missingVars };
}

// S3Client 초기화
function createS3Client(): S3Client | null {
  try {
    const validation = validateEnvironmentVariables();
    if (!validation.isValid) {
      console.error('[Info Image Upload] Missing env vars:', validation.missingVars);
      return null;
    }

    return new S3Client({
      region: 'auto',
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    });
  } catch (error) {
    console.error('[Info Image Upload] S3Client init error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Info Image Upload] Starting upload process');

    // 세션 확인
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 심사관 권한 확인
    if (session.user.role !== 'examiner' && session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Examiner role required' },
        { status: 403 }
      );
    }

    console.log('[Info Image Upload] Auth successful:', session.user.email);

    // S3Client 생성
    const s3Client = createS3Client();
    if (!s3Client) {
      return NextResponse.json(
        { success: false, error: 'R2 configuration error' },
        { status: 500 }
      );
    }

    // FormData 파싱
    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'No image file provided' },
        { status: 400 }
      );
    }

    console.log('[Info Image Upload] File received:', {
      name: image.name,
      size: `${(image.size / 1024 / 1024).toFixed(2)}MB`,
      type: image.type
    });

    // 파일 크기 체크
    if (image.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // 이미지 타입 체크
    if (!image.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'File must be an image' },
        { status: 400 }
      );
    }

    // 이미지 버퍼 읽기
    const buffer = Buffer.from(await image.arrayBuffer());

    /**
     * Sharp로 이미지 자동 압축 및 리사이즈
     *
     * @process
     *   1. 원본 비율 유지하면서 최대 너비 1200px로 리사이즈
     *   2. JPEG 압축 (품질 80%)
     *   3. 메타데이터 제거 (파일 크기 최적화)
     */
    const metadata = await sharp(buffer).metadata();
    console.log('[Info Image Upload] Original size:', {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: `${(image.size / 1024 / 1024).toFixed(2)}MB`,
    });

    let processedImage;

    // 너비가 MAX_WIDTH보다 큰 경우에만 리사이즈
    if (metadata.width && metadata.width > MAX_WIDTH) {
      processedImage = await sharp(buffer)
        .resize(MAX_WIDTH, null, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
    } else {
      // 크기가 충분히 작으면 압축만 적용
      processedImage = await sharp(buffer)
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
    }

    console.log('[Info Image Upload] Compressed size:', {
      originalMB: (image.size / 1024 / 1024).toFixed(2),
      compressedMB: (processedImage.length / 1024 / 1024).toFixed(2),
      compressionRatio: `${((1 - processedImage.length / image.size) * 100).toFixed(1)}%`,
    });

    // Cloudflare R2 업로드
    const fileName = `brand-info/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

    const uploadParams = {
      Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
      Key: fileName,
      Body: processedImage,
      ContentType: 'image/jpeg',
    };

    console.log('[Info Image Upload] Uploading to R2:', {
      Bucket: uploadParams.Bucket,
      Key: uploadParams.Key,
      Size: `${(processedImage.length / 1024 / 1024).toFixed(2)}MB`
    });

    await s3Client.send(new PutObjectCommand(uploadParams));

    // 공개 URL 생성
    const imageUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN}/${fileName}`;
    console.log('[Info Image Upload] Upload successful:', imageUrl);

    return NextResponse.json({
      success: true,
      imageUrl,
      message: 'Info image uploaded and compressed successfully',
      stats: {
        originalSize: `${(image.size / 1024 / 1024).toFixed(2)}MB`,
        compressedSize: `${(processedImage.length / 1024 / 1024).toFixed(2)}MB`,
        compressionRatio: `${((1 - processedImage.length / image.size) * 100).toFixed(1)}%`,
      },
    });
  } catch (error) {
    console.error('[Info Image Upload] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Info Image Upload] Error details:', {
      message: errorMessage,
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload info image',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
