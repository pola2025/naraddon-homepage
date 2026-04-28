import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/auth-options';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

/**
 * POST: 전문가 정보 수정 (관리자 전용)
 * @purpose 관리자가 전문가 프로필(이름, 직책, 회사명, 이메일, 전문분야, 소개, 이미지) 수정
 * @security admin 역할만 접근 가능
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Login required' },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db('naraddon');

    /**
     * 권한 완화 (2026-04-28): admin/super_admin 모두 허용
     */
    const currentUser = await db.collection('users').findOne({ email: session.user.email });
    const role = currentUser?.role;

    if (!currentUser || (role !== 'admin' && role !== 'super_admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { expertId, name, position, companyName, email, specialties, introduction, imageUrl } =
      body;

    if (!expertId) {
      return NextResponse.json({ success: false, error: 'expertId is required' }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (position !== undefined) updateData.position = position;
    if (companyName !== undefined) updateData.companyName = companyName;
    if (email !== undefined) updateData.email = email;
    if (specialties !== undefined) updateData.specialties = specialties;
    if (introduction !== undefined) updateData.introduction = introduction;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    updateData.updatedAt = new Date();

    const result = await db
      .collection('experts')
      .updateOne({ _id: new ObjectId(expertId) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: 'Expert not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update expert:', error);
    return NextResponse.json({ success: false, error: 'Failed to update expert' }, { status: 500 });
  }
}
