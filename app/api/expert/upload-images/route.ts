import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * 전문가 갤러리 이미지 업로드 API
 *
 * @purpose 전문가가 상세 페이지 갤러리에 표시할 이미지 업로드
 * @context 이미지는 WebP 형식으로 자동 압축되어 저장
 * @security 전문가 권한 필수, 10MB 파일 크기 제한
 */
export async function POST(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'expert') {
      return NextResponse.json(
        { success: false, error: '전문가 권한이 필요합니다.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const images = formData.getAll('images') as File[];

    if (images.length === 0) {
      return NextResponse.json(
        { success: false, error: '업로드할 이미지가 없습니다.' },
        { status: 400 }
      );
    }

    // 10MB 크기 제한 확인
    const maxSize = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = images.filter(file => file.size > maxSize);

    if (oversizedFiles.length > 0) {
      return NextResponse.json(
        { success: false, error: `이미지 크기는 최대 10MB까지 업로드 가능합니다. (${oversizedFiles.length}개 파일 초과)` },
        { status: 400 }
      );
    }

    // 업로드 디렉토리 생성
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'experts', 'gallery');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const imageUrls: string[] = [];

    // 각 이미지 처리
    for (const image of images) {
      const buffer = Buffer.from(await image.arrayBuffer());

      // 파일명 생성 (타임스탬프 + 랜덤 문자열)
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const filename = `${timestamp}_${randomStr}.webp`;
      const filepath = path.join(uploadDir, filename);

      // Sharp를 사용하여 WebP로 변환 및 압축
      await sharp(buffer)
        .webp({ quality: 85 }) // 85% 품질로 WebP 압축
        .resize(1200, 1200, { // 최대 1200x1200 크기로 리사이즈
          fit: 'inside',
          withoutEnlargement: true
        })
        .toFile(filepath);

      // URL 저장
      const imageUrl = `/uploads/experts/gallery/${filename}`;
      imageUrls.push(imageUrl);
    }

    // MongoDB에 이미지 URL 업데이트
    const { db } = await connectToDatabase();
    const experts = db.collection('experts');

    await experts.updateOne(
      { email: session.user.email },
      {
        $push: {
          galleryImages: { $each: imageUrls }
        },
        $set: {
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({
      success: true,
      imageUrls,
      message: `${imageUrls.length}개 이미지가 업로드되었습니다.`
    });

  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { success: false, error: '이미지 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 갤러리 이미지 삭제 API
 */
export async function DELETE(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'expert') {
      return NextResponse.json(
        { success: false, error: '전문가 권한이 필요합니다.' },
        { status: 401 }
      );
    }

    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: '삭제할 이미지 URL이 필요합니다.' },
        { status: 400 }
      );
    }

    // MongoDB에서 이미지 URL 제거
    const { db } = await connectToDatabase();
    const experts = db.collection('experts');

    await experts.updateOne(
      { email: session.user.email },
      {
        $pull: {
          galleryImages: imageUrl
        },
        $set: {
          updatedAt: new Date()
        }
      }
    );

    // 실제 파일 삭제 (선택사항 - 나중에 정리 스크립트로 처리 가능)
    // const filepath = path.join(process.cwd(), 'public', imageUrl);
    // if (existsSync(filepath)) {
    //   await unlink(filepath);
    // }

    return NextResponse.json({
      success: true,
      message: '이미지가 삭제되었습니다.'
    });

  } catch (error) {
    console.error('Image deletion error:', error);
    return NextResponse.json(
      { success: false, error: '이미지 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
