import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth-options';
import sharp from 'sharp';
import { uploadToR2 } from '@/lib/cloudflare-r2';

/**
 * POST /api/examiner/brand/upload-logo
 *
 * @purpose 회사 로고 이미지 업로드
 * @context 사용자 요청: "로고는 직접 올리면 반영 안올리면 미반영"
 * @decision
 *   - Sharp로 투명 배경 PNG 유지 또는 JPEG 변환
 *   - 최대 width 400px로 리사이즈
 *   - Cloudflare R2 업로드
 *   - Examiner 권한만 허용
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const LOGO_MAX_WIDTH = 400; // 로고 최대 너비

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
        { success: false, error: 'File size exceeds 5MB limit' },
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
     * Sharp로 로고 이미지 최적화
     *
     * @process
     *   1. 원본 비율 유지하며 최대 너비 400px로 리사이즈
     *   2. PNG면 투명 배경 유지, 그 외는 JPEG 변환
     */
    const metadata = await sharp(buffer).metadata();
    const isPng = metadata.format === 'png' && metadata.hasAlpha;

    let processedImage: Buffer;
    let contentType: string;
    let ext: string;

    if (isPng) {
      // PNG 투명 배경 유지
      processedImage = await sharp(buffer)
        .resize(LOGO_MAX_WIDTH, null, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .png({ quality: 90 })
        .toBuffer();
      contentType = 'image/png';
      ext = 'png';
    } else {
      // JPEG로 변환
      processedImage = await sharp(buffer)
        .resize(LOGO_MAX_WIDTH, null, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 90 })
        .toBuffer();
      contentType = 'image/jpeg';
      ext = 'jpg';
    }

    // Cloudflare R2 업로드
    const fileName = `company-logo-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const imageUrl = await uploadToR2(processedImage, fileName, contentType);

    console.log('[Company Logo Upload] Uploaded:', imageUrl);

    return NextResponse.json({
      success: true,
      imageUrl,
      message: 'Logo uploaded successfully',
    });
  } catch (error) {
    console.error('[Company Logo Upload] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload logo' }, { status: 500 });
  }
}
