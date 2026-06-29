import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth-options';
import sharp from 'sharp';
import { uploadToR2 } from '@/lib/cloudflare-r2';
import { reportInfraError, getClientIp } from '@/lib/telegram-infra';

/**
 * POST /api/examiner/brand/upload-success-thumbnail
 *
 * @purpose 성공케이스 썸네일 이미지 업로드 (1:1 비율)
 * @context 사용자 요청: "성공케이스는 게시판 형태로 작성 (이미지 업로드 1:1 썸네일 사이즈)"
 * @decision
 *   - Sharp로 1:1 정사각형 크롭 (600x600)
 *   - Cloudflare R2 업로드
 *   - Examiner 권한만 허용
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const THUMBNAIL_SIZE = 600; // 600x600 정사각형

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
     * Sharp로 1:1 정사각형 크롭 및 리사이즈
     *
     * @process
     *   1. 원본 이미지의 짧은 쪽을 기준으로 정사각형 크롭
     *   2. 600x600으로 리사이즈
     *   3. JPEG 압축 (품질 85%)
     */
    const metadata = await sharp(buffer).metadata();
    const minDimension = Math.min(metadata.width!, metadata.height!);

    const processedImage = await sharp(buffer)
      .resize(minDimension, minDimension, {
        fit: 'cover',
        position: 'center',
      })
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE)
      .jpeg({ quality: 85 })
      .toBuffer();

    // Cloudflare R2 업로드
    const fileName = `success-case-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    const imageUrl = await uploadToR2(processedImage, fileName, 'image/jpeg');

    console.log('[Success Thumbnail Upload] Uploaded:', imageUrl);

    return NextResponse.json({
      success: true,
      imageUrl,
      message: 'Thumbnail uploaded successfully',
    });
  } catch (error) {
    console.error('[Success Thumbnail Upload] Error:', error);
    await reportInfraError({
      route: 'examiner/upload-success-thumbnail',
      error,
      ip: getClientIp(request),
      status: 500,
    });
    return NextResponse.json(
      { success: false, error: 'Failed to upload thumbnail' },
      { status: 500 }
    );
  }
}
