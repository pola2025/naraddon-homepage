import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import ExpertExaminer from '@/models/ExpertExaminer';
import { certifiedExaminers } from '@/data/certifiedExaminers';

export const dynamic = 'force-dynamic';

const normalizeCategory = (value: unknown): string => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return 'funding';
};

const parseSpecialties = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item): item is string => Boolean(item));
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'examiner';

const seedExaminersIfNeeded = async () => {
  const total = await ExpertExaminer.countDocuments();
  if (total > 0) {
    return;
  }

  const seedRecords = certifiedExaminers.map((seed, index) => {
    const imageUrl = seed.imageKey ? `/images/examiners/${seed.imageKey}.png` : '';
    const legacyKey = seed.imageKey
      ? seed.imageKey.toLowerCase()
      : slugify(`${seed.name}-${index}`);
    return {
      name: seed.name,
      position: seed.position || '인증 기업심사관',
      companyName: seed.companyName ?? '',
      category: normalizeCategory(seed.category),
      specialties: parseSpecialties(seed.expertiseTags ?? []),
      imageUrl,
      imageAlt: `${seed.name} 인증 기업심사관`,
      sortOrder: index,
      legacyKey,
      isPublished: true,
    };
  });

  if (seedRecords.length > 0) {
    await ExpertExaminer.insertMany(seedRecords, { ordered: false });
  }
};

// GET /api/admin/examiners - 심사관 목록 조회 (관리자 전용)
export async function GET(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // MongoDB 연결
    await connectDB();

    // 현재 로그인한 사용자의 role을 DB에서 확인
    const mongoose = await import('mongoose');
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const currentUser = await User.findOne({ email: session.user?.email });

    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    const userRole = currentUser.role;

    // 관리자만 접근 가능
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({
        error: 'Forbidden - Admin access required',
        debug: {
          currentUserEmail: session.user?.email,
          currentUserRole: userRole
        }
      }, { status: 403 });
    }

    // 심사관 데이터 seed (없는 경우)
    await seedExaminersIfNeeded();

    // 심사관 목록 조회 (모든 심사관)
    const examiners = await ExpertExaminer.find({})
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    // 응답 데이터 포맷팅
    const formattedExaminers = examiners.map(examiner => ({
      _id: examiner._id.toString(),
      name: examiner.name,
      position: examiner.position,
      companyName: examiner.companyName,
      category: examiner.category,
      specialties: examiner.specialties || [],
      imageUrl: examiner.imageUrl,
      userId: examiner.userId,
      isPublished: examiner.isPublished,
      sortOrder: examiner.sortOrder,
      createdAt: examiner.createdAt,
      updatedAt: examiner.updatedAt
    }));

    return NextResponse.json({
      examiners: formattedExaminers,
      total: formattedExaminers.length
    });

  } catch (error) {
    console.error('[Admin Examiners API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch examiners', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
