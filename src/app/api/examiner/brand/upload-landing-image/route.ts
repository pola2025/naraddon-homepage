/**
 * 심사관 브랜드 페이지 랜딩 이미지 업로드 API
 *
 * @purpose 심사관이 브랜드 페이지에 표시할 랜딩 이미지를 업로드
 * @context 이미지 자동 압축 후 Cloudflare R2에 저장
 * @route POST /api/examiner/brand/upload-landing-image
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { compressImageOnServer } from '@/lib/image/serverImageCompressor';
import { uploadToR2 } from '@/lib/cloudflare/r2Client';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'examiner') {
      return NextResponse.json(
        { error: '심사관 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    // FormData에서 이미지 가져오기
    const formData = await req.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: '이미지 파일이 필요합니다.' },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '지원하지 않는 이미지 형식입니다. (JPEG, PNG, WebP만 가능)' },
        { status: 400 }
      );
    }

    // 파일을 Buffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`📸 원본 이미지: ${file.name}, 크기: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);

    // 이미지 압축 (10MB 이하, 1920px 제한)
    const compressed = await compressImageOnServer(buffer, {
      maxSizeMB: 10,
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 85,
      format: 'jpeg' // 랜딩 이미지는 JPEG로 통일
    });

    console.log(`✅ 압축 완료: ${(compressed.compressedSize / 1024 / 1024).toFixed(2)}MB (${compressed.compressionRatio.toFixed(1)}% 절감)`);

    // Cloudflare R2에 업로드
    const examinerSlug = session.user.slug || session.user.id;
    const fileName = `brands/${examinerSlug}/landing-image.jpg`;

    const uploadedUrl = await uploadToR2({
      key: fileName,
      body: compressed.buffer,
      contentType: 'image/jpeg'
    });

    // 데이터베이스에 이미지 URL 저장
    const { db } = await connectToDatabase();
    await db.collection('examiners').updateOne(
      { slug: examinerSlug },
      {
        $set: {
          'brandPage.landingImage': uploadedUrl,
          'brandPage.landingImageUpdatedAt': new Date()
        }
      }
    );

    return NextResponse.json({
      success: true,
      url: uploadedUrl,
      stats: {
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize,
        compressionRatio: compressed.compressionRatio,
        width: compressed.width,
        height: compressed.height
      }
    });

  } catch (error) {
    console.error('랜딩 이미지 업로드 실패:', error);

    return NextResponse.json(
      {
        error: '이미지 업로드에 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
