import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

import connectDB from '@/lib/mongodb';
import ExpertExaminer from '@/models/ExpertExaminer';
import { VERIFIED_EXPERT_PROFILES as VERIFIED_EXPERT_PROFILES_DATA } from '@/data/expertsShowcase';

const isValidObjectId = (value: string) => mongoose.Types.ObjectId.isValid(value);

const normalizeImageUrl = (imageUrl: string | undefined, legacyKey: string | undefined, name: string) => {
  if (typeof imageUrl === 'string' && imageUrl.trim().length > 0) {
    return imageUrl.trim();
  }
  if (legacyKey && legacyKey.trim().length > 0) {
    return `/images/examiners/${legacyKey.trim()}.png`;
  }
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return slug ? `/images/examiners/${slug}.png` : '';
};

const mapExaminerToExpertProfile = (examiner: any) => {
  const legacyKey = typeof examiner.legacyKey === 'string' ? examiner.legacyKey : undefined;
  const imageUrl = normalizeImageUrl(examiner.imageUrl, legacyKey, examiner.name ?? '');

  return {
    id: examiner._id?.toString() ?? legacyKey ?? examiner.name,
    name: examiner.name,
    position: examiner.position,
    companyName: examiner.companyName ?? '',
    category: examiner.category ?? 'expert',
    specialties: Array.isArray(examiner.specialties) ? examiner.specialties : [],
    imageUrl,
    imageAlt:
      typeof examiner.imageAlt === 'string' && examiner.imageAlt.trim().length > 0
        ? examiner.imageAlt.trim()
        : `${examiner.name} 전문가`,
    sortOrder: typeof examiner.sortOrder === 'number' ? examiner.sortOrder : 0,
    headline: examiner.headline ?? '',
    bio: examiner.bio ?? '',
    profileHighlights: Array.isArray(examiner.profileHighlights) ? examiner.profileHighlights : [],
    focusAreas: Array.isArray(examiner.focusAreas) ? examiner.focusAreas : [],
    activityStats: examiner.activityStats ?? null,
    verifiedAt: examiner.updatedAt ?? examiner.createdAt ?? null,
  };
};

const findFallbackExpert = (id: string) => {
  const lowerId = id.toLowerCase();
  return VERIFIED_EXPERT_PROFILES_DATA.find((profile) => {
    const possibleIds = [
      profile._id,
      profile.legacyKey,
      profile.name,
      profile.companyName,
    ]
      .filter(Boolean)
      .map((value) => value!.toString().toLowerCase());
    return possibleIds.includes(lowerId);
  });
};

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    await connectDB();

    let examiner;

    if (isValidObjectId(id)) {
      examiner = await ExpertExaminer.findById(id).lean();
    }

    if (!examiner) {
      examiner = await ExpertExaminer.findOne({ legacyKey: id.toLowerCase() }).lean();
    }

    if (examiner && examiner.isPublished === false) {
      examiner = null;
    }

    if (examiner) {
      return NextResponse.json({ expert: mapExaminerToExpertProfile(examiner) });
    }

    const fallback = findFallbackExpert(id);
    if (fallback) {
      return NextResponse.json({ expert: mapExaminerToExpertProfile(fallback) });
    }

    return NextResponse.json({ message: 'Expert profile was not found.' }, { status: 404 });
  } catch (error) {
    console.error('[expert-services/experts][GET id]', error);
    const fallback = findFallbackExpert(id);
    if (fallback) {
      return NextResponse.json({ expert: mapExaminerToExpertProfile(fallback) });
    }
    return NextResponse.json({ message: 'Failed to load expert profile.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  // 관리자 권한 확인
  const adminAuth = request.headers.get('x-admin-auth');
  if (adminAuth !== 'true') {
    return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    await connectDB();
    const body = await request.json();

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.position !== undefined) updateData.position = body.position;
    if (body.companyName !== undefined) updateData.companyName = body.companyName;
    if (body.specialties !== undefined) updateData.specialties = body.specialties;
    if (body.imageKey !== undefined) updateData.legacyKey = body.imageKey;
    if (body.order !== undefined) updateData.sortOrder = body.order;
    if (body.isActive !== undefined) updateData.isPublished = body.isActive;

    let expert;
    if (isValidObjectId(id)) {
      expert = await ExpertExaminer.findByIdAndUpdate(id, updateData, { new: true });
    } else {
      expert = await ExpertExaminer.findOneAndUpdate({ legacyKey: id }, updateData, { new: true });
    }

    if (!expert) {
      return NextResponse.json({ message: '전문가를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      expert: mapExaminerToExpertProfile(expert)
    });
  } catch (error) {
    console.error('[expert-services/experts][PATCH]', error);
    return NextResponse.json({ error: '전문가 수정에 실패했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  // 관리자 권한 확인
  const adminAuth = request.headers.get('x-admin-auth');
  if (adminAuth !== 'true') {
    return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    await connectDB();

    let expert;
    if (isValidObjectId(id)) {
      expert = await ExpertExaminer.findByIdAndDelete(id);
    } else {
      expert = await ExpertExaminer.findOneAndDelete({ legacyKey: id });
    }

    if (!expert) {
      return NextResponse.json({ message: '전문가를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '전문가가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('[expert-services/experts][DELETE]', error);
    return NextResponse.json({ error: '전문가 삭제에 실패했습니다.' }, { status: 500 });
  }
}
