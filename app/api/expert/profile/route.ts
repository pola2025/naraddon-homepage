import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/auth-options';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

/**
 * GET: 현재 로그인한 전문가의 프로필 조회
 * @purpose 전문가 대시보드에서 본인의 프로필 정보를 불러옴
 * @context 세션의 userId로 experts 컬렉션의 userId 필드를 조회
 * @security expert 또는 admin 역할 접근 가능
 */
export async function GET(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);

    if (!session || !session.user || (session.user.role !== 'expert' && session.user.role !== 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Expert or Admin access required' },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db('naraddon');

    // 세션의 userId로 전문가 정보 조회 (experts.userId로 검색)
    const userId = session.user.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID not found in session' },
        { status: 400 }
      );
    }

    const profile = await db.collection('experts').findOne({
      userId: userId,
      isActive: true
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' },
        { status: 404 }
      );
    }

    // imageUrl 생성 (imageKey가 있는 경우)
    if (profile.imageKey && !profile.imageUrl) {
      const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
      profile.imageUrl = `${R2_PUBLIC_URL}/${profile.imageKey}.png`;
    }

    return NextResponse.json({
      success: true,
      profile: {
        ...profile,
        _id: profile._id.toString()
      }
    });
  } catch (error) {
    console.error('Failed to fetch expert profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

/**
 * PUT: 전문가 프로필 정보 수정
 * @purpose 전문가가 본인의 프로필 정보를 업데이트
 * @context 세션의 userId와 일치하는 전문가만 수정 가능
 * @security expert 또는 admin 역할 접근 가능, 본인 프로필만 수정 가능
 */
export async function PUT(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);

    if (!session || !session.user || (session.user.role !== 'expert' && session.user.role !== 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Expert or Admin access required' },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db('naraddon');

    const userId = session.user.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID not found in session' },
        { status: 400 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();

    // 업데이트 가능한 필드만 추출 (보안상 중요)
    const allowedFields = {
      name: body.name,
      position: body.position,
      companyName: body.companyName,
      phone: body.phone,
      email: body.email,
      specialties: body.specialties || [],
      introduction: body.introduction,
      detailedIntro: body.detailedIntro,
      career: body.career || [],
      certifications: body.certifications || [],
      services: body.services || []
    };

    // 필수 필드 검증
    if (!allowedFields.name || !allowedFields.position || !allowedFields.companyName || !allowedFields.introduction) {
      return NextResponse.json(
        { success: false, error: 'Required fields are missing: name, position, companyName, introduction' },
        { status: 400 }
      );
    }

    // 전문가 프로필 업데이트 (userId로 검색)
    const result = await db.collection('experts').updateOne(
      {
        userId: userId,
        isActive: true
      },
      {
        $set: {
          ...allowedFields,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Failed to update expert profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
