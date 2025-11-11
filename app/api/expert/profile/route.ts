import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/auth-options';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

/**
 * GET: 전문가 프로필 조회
 * @purpose 전문가 본인 또는 관리자가 전문가 프로필을 조회
 * @context
 *   - 전문가 본인: expertId 파라미터 없이 호출 → 본인 프로필 조회 (userId로 검색)
 *   - 관리자: expertId 파라미터로 호출 → 특정 전문가 프로필 조회 (_id로 검색)
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

    // URL 파라미터에서 expertId 가져오기
    const { searchParams } = new URL(request.url);
    const expertId = searchParams.get('expertId');

    let profile;

    if (expertId) {
      // 관리자가 특정 전문가 조회: _id로 검색
      if (session.user.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Admin access required to view other experts' },
          { status: 403 }
        );
      }

      profile = await db.collection('experts').findOne({
        _id: new ObjectId(expertId),
        isActive: true
      });
    } else {
      // 전문가 본인 조회: userId로 검색
      const userId = session.user.id;

      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'User ID not found in session' },
          { status: 400 }
        );
      }

      profile = await db.collection('experts').findOne({
        userId: userId,
        isActive: true
      });
    }

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
 * @purpose 전문가 본인 또는 관리자가 전문가 프로필을 수정
 * @context
 *   - 전문가 본인: body._id로 본인 프로필 수정 (보안 검증: userId 일치 확인)
 *   - 관리자: body._id로 모든 전문가 프로필 수정 가능
 * @security expert 또는 admin 역할 접근 가능
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

    // 요청 본문 파싱
    const body = await request.json();

    // body._id가 수정 대상 전문가 프로필 ID
    const targetExpertId = body._id;

    if (!targetExpertId) {
      return NextResponse.json(
        { success: false, error: 'Expert ID is required in request body' },
        { status: 400 }
      );
    }

    // 전문가 본인인 경우: 본인 프로필만 수정 가능 (보안 검증)
    if (session.user.role === 'expert') {
      const expertProfile = await db.collection('experts').findOne({
        _id: new ObjectId(targetExpertId),
        isActive: true
      });

      if (!expertProfile || expertProfile.userId !== session.user.id) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: You can only edit your own profile' },
          { status: 403 }
        );
      }
    }

    // 관리자는 모든 전문가 프로필 수정 가능 (별도 검증 불필요)

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
      services: body.services || [],
      successCases: body.successCases || [],
      galleryImages: body.galleryImages || []
    };

    // 필수 필드 검증
    if (!allowedFields.name || !allowedFields.position || !allowedFields.companyName || !allowedFields.introduction) {
      return NextResponse.json(
        { success: false, error: 'Required fields are missing: name, position, companyName, introduction' },
        { status: 400 }
      );
    }

    // 전문가 프로필 업데이트 (_id로 검색)
    const result = await db.collection('experts').updateOne(
      {
        _id: new ObjectId(targetExpertId),
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
