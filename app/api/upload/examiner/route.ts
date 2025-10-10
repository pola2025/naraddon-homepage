import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '@/lib/mongodb-client';

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
  const debugSteps: string[] = [];

  try {
    debugSteps.push('1. Starting upload');

    // 세션 확인
    debugSteps.push('2. Checking session');
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized', debug: debugSteps }, { status: 401 });
    }
    debugSteps.push('3. Session found');

    // MongoDB 연결하여 사용자 role 확인
    debugSteps.push('4. Connecting to MongoDB');
    const client = await clientPromise;
    const db = client.db('naraddon');

    debugSteps.push('5. Finding user');
    const currentUser = await db.collection('users').findOne({ email: session.user?.email });
    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found', debug: debugSteps }, { status: 404 });
    }
    debugSteps.push('6. User found');

    const userRole = currentUser.role;

    // 관리자만 접근 가능
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required', debug: debugSteps },
        { status: 403 }
      );
    }
    debugSteps.push('7. Admin access verified');

    // R2 설정 확인
    debugSteps.push('8. Checking R2 config');
    if (!isR2Configured() || !BUCKET_NAME) {
      return NextResponse.json(
        { error: 'Cloudflare R2 버킷 설정이 누락되었습니다.', debug: debugSteps },
        { status: 503 }
      );
    }
    debugSteps.push('9. R2 configured');

    debugSteps.push('10. Parsing form data');
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: '파일이 존재하지 않습니다.', debug: debugSteps },
        { status: 400 }
      );
    }
    debugSteps.push('11. File found');

    // 파일 타입 검증
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: '지원하지 않는 파일 형식입니다. JPG, PNG, WebP, GIF만 허용됩니다.', debug: debugSteps },
        { status: 400 }
      );
    }
    debugSteps.push('12. File type validated');

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '파일 크기가 5MB를 초과합니다.', debug: debugSteps },
        { status: 400 }
      );
    }
    debugSteps.push('13. File size validated');

    // 파일명 생성 (examiners 폴더에 저장)
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `examiners/${uuidv4()}.${extension}`.toLowerCase();
    debugSteps.push('14. Filename generated');

    debugSteps.push('15. Converting to buffer');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    debugSteps.push('16. Buffer created');

    // R2에 업로드
    debugSteps.push('17. Getting R2 client');
    const s3Client = getR2Client();

    debugSteps.push('18. Creating upload command');

    // 원본 파일명을 Base64로 인코딩 (한글/특수문자 지원)
    const originalNameBase64 = Buffer.from(file.name, 'utf-8').toString('base64');

    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
      CacheControl: 'max-age=31536000', // 1년
      Metadata: {
        'uploaded-at': new Date().toISOString(),
        'uploaded-by': (session.user?.email || 'unknown').replace(/[^\x20-\x7E]/g, ''),
        'original-name-b64': originalNameBase64,
        'purpose': 'examiner-profile'
      }
    });

    debugSteps.push('19. Uploading to R2');
    await s3Client.send(uploadCommand);
    debugSteps.push('20. Upload successful');

    // 공개 CDN URL 생성 (buildR2ObjectUrl 사용)
    const cdnUrl = buildR2ObjectUrl(fileName, BUCKET_NAME);

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('[Upload Examiner] Error details:', {
      message: errorMessage,
      stack: errorStack,
      debugSteps,
      env: {
        hasR2Bucket: !!BUCKET_NAME,
        hasAccountId: !!ACCOUNT_ID,
        r2Configured: isR2Configured()
      }
    });

    return NextResponse.json(
      {
        error: '이미지 업로드 중 오류가 발생했습니다.',
        message: errorMessage,
        debug: debugSteps,
        lastStep: debugSteps[debugSteps.length - 1]
      },
      { status: 500 }
    );
  }
}
