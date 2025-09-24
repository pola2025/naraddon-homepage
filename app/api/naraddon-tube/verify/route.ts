import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ExaminerProfile from '@/models/ExaminerProfile';
import { certifiedExaminers } from '@/data/certifiedExaminers';

// API Route를 동적으로 설정
export const dynamic = 'force-dynamic';

// 환경변수에서 비밀번호 가져오기
const ADMIN_PASSWORD = process.env.NARADDON_TUBE_PASSWORD;

// 시드 데이터 초기화 함수
const seedExaminersIfNeeded = async () => {
  try {
    const count = await ExaminerProfile.countDocuments();

    if (count === 0) {
      console.log('[naraddon-tube/verify] Seeding examiner profiles...');

      // certifiedExaminers 데이터를 DB에 삽입
      const seedData = certifiedExaminers.map((examiner, index) => ({
        name: examiner.name,
        companyName: examiner.companyName,
        position: examiner.position,
        category: examiner.category,
        brandIcon: examiner.brandIcon,
        rating: examiner.rating,
        successRate: examiner.successRate,
        consultCount: examiner.consultCount,
        imageKey: examiner.imageKey,
        imageUrl: examiner.imageKey ? `/images/examiners/${examiner.imageKey}.png` : null,
        imageAlt: `${examiner.name} ${examiner.position}`,
        expertiseTags: examiner.expertiseTags,
        expertiseDescription: examiner.expertiseDescription,
        expertiseDetail: examiner.expertiseDetail,
        sortOrder: index,
        legacyKey: examiner.imageKey || `examiner-${index}`,
        isPublished: true,
      }));

      await ExaminerProfile.insertMany(seedData);
      console.log(`[naraddon-tube/verify] Seeded ${seedData.length} examiner profiles`);
    }
  } catch (error) {
    console.error('[naraddon-tube/verify] Seed error:', error);
  }
};

// 인증 확인 API
export async function POST(request: Request) {
  try {
    console.log('[naraddon-tube/verify] POST request received');

    const body = await request.json();
    const { password } = body ?? {};

    console.log('[naraddon-tube/verify] Checking password...');

    if (!ADMIN_PASSWORD) {
      console.error('[naraddon-tube/verify] NARADDON_TUBE_PASSWORD not set in environment');
      return NextResponse.json({
        message: '서버 설정 오류: 비밀번호가 설정되지 않았습니다.'
      }, { status: 500 });
    }

    if (!password || password !== ADMIN_PASSWORD) {
      console.log('[naraddon-tube/verify] Invalid password');
      return NextResponse.json({
        message: '비밀번호가 올바르지 않습니다.'
      }, { status: 401 });
    }

    // 비밀번호가 맞으면 DB 연결 및 시드 데이터 초기화
    await connectDB();
    await seedExaminersIfNeeded();

    console.log('[naraddon-tube/verify] Authentication successful');
    return NextResponse.json({
      success: true,
      message: '인증되었습니다.'
    });
  } catch (error) {
    console.error('[naraddon-tube/verify] Error:', error);
    return NextResponse.json({
      message: '비밀번호 확인에 실패했습니다.'
    }, { status: 500 });
  }
}

// 인증된 심사관 목록 조회 API
export async function GET(request: NextRequest) {
  try {
    console.log('[naraddon-tube/verify] GET request received');

    // 헤더에서 비밀번호 확인
    const password = request.headers.get('x-admin-password');

    if (!ADMIN_PASSWORD) {
      console.error('[naraddon-tube/verify] NARADDON_TUBE_PASSWORD not set');
      return NextResponse.json({
        message: '서버 설정 오류'
      }, { status: 500 });
    }

    if (!password || password !== ADMIN_PASSWORD) {
      return NextResponse.json({
        message: '인증이 필요합니다.'
      }, { status: 401 });
    }

    await connectDB();
    await seedExaminersIfNeeded();

    const examiners = await ExaminerProfile
      .find({ isPublished: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    console.log(`[naraddon-tube/verify] Found ${examiners.length} examiners`);

    return NextResponse.json({
      success: true,
      examiners,
      total: examiners.length
    });
  } catch (error) {
    console.error('[naraddon-tube/verify] GET Error:', error);
    return NextResponse.json({
      message: '심사관 목록 조회에 실패했습니다.'
    }, { status: 500 });
  }
}
