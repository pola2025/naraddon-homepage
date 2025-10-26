import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import clientPromise from '@/lib/mongodb-client';

/**
 * GET /api/examiner/profile
 *
 * @purpose 현재 로그인한 심사관의 프로필 및 브랜드 페이지 정보 조회
 * @context 브랜드 페이지 편집을 위한 데이터 로드
 * @decision 세션에서 사용자 이메일로 expert-examiners 컬렉션 조회
 */
export async function GET(request: NextRequest) {
  try {
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

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');
    const { ObjectId } = require('mongodb');

    let examiner;

    /**
     * 심사관 조회 전략 (2단계 fallback)
     *
     * @strategy1 세션의 examinerId 사용 (최우선, 가장 빠름)
     * @strategy2 email OR userId로 조회 (fallback, 기존 세션 대응)
     * @purpose 네이버 로그인 프로세스 보호하면서 기존 세션도 지원
     */
    if (session.user.examinerId) {
      // 🔥 전략1: 세션의 examinerId로 직접 조회 (1회 조회, 일관성 보장)
      examiner = await db.collection('expert-examiners').findOne({
        _id: new ObjectId(session.user.examinerId),
      });
      console.log('[Examiner Profile API] Using cached examinerId from session:', session.user.examinerId);
    }

    if (!examiner) {
      // 🔥 전략2: email OR userId로 조회 (기존 세션 fallback)
      const userId = session.user.id;
      const query = userId
        ? { $or: [{ email: session.user.email }, { userId }] }
        : { email: session.user.email };

      examiner = await db.collection('expert-examiners').findOne(query);
      console.log('[Examiner Profile API] Fallback query by email/userId:', { email: session.user.email, userId, found: !!examiner });
    }

    if (!examiner) {
      return NextResponse.json(
        { success: false, error: 'Examiner profile not found' },
        { status: 404 }
      );
    }

    // 응답 데이터 구성
    return NextResponse.json({
      success: true,
      examiner: {
        _id: examiner._id.toString(),
        name: examiner.name,
        email: examiner.email,
        companyName: examiner.companyName,
        position: examiner.position,
        imageUrl: examiner.imageUrl,
        specialties: examiner.specialties || [],
        brandPage: examiner.brandPage || {
          companyLogo: '',
          companyIntro: '',
          useDefaultIntro: true,
          infoImage: '',
          careers: [],
          successCases: [],
          contactInfo: {
            website: '',
            consultationHours: '',
            address: '',
          },
        },
      },
    });
  } catch (error) {
    console.error('[Examiner Profile API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
