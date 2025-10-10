import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

import { buildR2ObjectUrl, getR2Client, isR2Configured } from '@/lib/r2';

export const dynamic = 'force-dynamic';

/**
 * POST /api/upload/examiner - 심사관 이미지 업로드
 *
 * @purpose 심사관 프로필 이미지를 Cloudflare R2에 업로드
 * @context 관리자만 심사관 이미지 업로드 가능
 * @security 관리자 권한 확인 필수
 * @returns 업로드된 이미지 URL 반환
 */

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (심사관 이미지는 더 작게)

export async function POST(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 관리자 권한 확인
    const userRole = (session.user as any)?.role;
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // R2 설정 확인
    if (!isR2Configured() || !BUCKET_NAME) {
      return NextResponse.json(
        { error: 'Cloudflare R2 버킷 설정이 누락되었습니다.' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: '파일이 존재하지 않습니다.' },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: '지원하지 않는 파일 형식입니다. JPG, PNG, WebP, GIF만 허용됩니다.' },
        { status: 400 }
      );
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '파일 크기가 5MB를 초과합니다.' },
        { status: 400 }
      );
    }

    // 파일명 생성 (examiners 폴더에 저장)
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `examiners/${uuidv4()}.${extension}`.toLowerCase();

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // R2에 업로드
    const s3Client = getR2Client();
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
      CacheControl: 'max-age=31536000', // 1년
      Metadata: {
        uploadedAt: new Date().toISOString(),
        uploadedBy: session.user?.email || 'unknown',
        originalName: file.name,
        purpose: 'examiner-profile'
      }
    });

    await s3Client.send(uploadCommand);

    // CDN URL 생성
    const cdnUrl = ACCOUNT_ID
      ? `https://pub-${ACCOUNT_ID}.r2.dev/${fileName}`
      : buildR2ObjectUrl(fileName, BUCKET_NAME);

    console.log('[Upload Examiner] Image uploaded:', {
      fileName,
      cdnUrl,
      uploadedBy: session.user?.email
    });

    return NextResponse.json({
      success: true,
      url: cdnUrl,
      fileName,
      size: file.size,
      type: file.type
    });
  } catch (error) {
    console.error('[Upload Examiner] Upload failed:', error);
    return NextResponse.json(
      { error: '이미지 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
