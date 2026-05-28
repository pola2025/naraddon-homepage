import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth-options';
import sharp from 'sharp';
import { uploadToR2 } from '@/lib/cloudflare-r2';

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

export async function POST(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    /**
     * 권한 체크: examiner 본인 + admin/super_admin 모두 허용
     * @context 관리자가 통합 페이지(/admin/experts)에서 모든 전문가의 brandPage 편집 가능
     */
    const role = session.user.role;
    if (role !== 'examiner' && role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: examiner/admin role required' },
        { status: 403 }
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

    // 파일 크기 체크
    if (image.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // 이미지 타입 체크
    if (!image.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'File must be an image' }, { status: 400 });
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
        .webp({ quality: 80 })
        .toBuffer();
    } else {
      // 크기가 충분히 작으면 압축만 적용
      processedImage = await sharp(buffer).webp({ quality: 80 }).toBuffer();
    }

    console.log('[Info Image Upload] Compressed size:', {
      originalMB: (image.size / 1024 / 1024).toFixed(2),
      compressedMB: (processedImage.length / 1024 / 1024).toFixed(2),
      compressionRatio: `${((1 - processedImage.length / image.size) * 100).toFixed(1)}%`,
    });

    // Cloudflare R2 업로드
    const fileName = `brand-info/${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
    const imageUrl = await uploadToR2(processedImage, fileName, 'image/webp');

    console.log('[Info Image Upload] Uploaded:', imageUrl);

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
    return NextResponse.json(
      { success: false, error: 'Failed to upload info image' },
      { status: 500 }
    );
  }
}
