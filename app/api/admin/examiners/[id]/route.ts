import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

// PUT /api/admin/examiners/[id] - 심사관 수정 (관리자 전용)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    // 현재 로그인한 사용자의 role을 DB에서 확인
    const currentUser = await db.collection('users').findOne({ email: session.user?.email });
    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    const userRole = currentUser.role;

    // 관리자만 접근 가능
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({
        error: 'Forbidden - Admin access required'
      }, { status: 403 });
    }

    const examinerId = params.id;
    const body = await request.json();
    const { name, position, companyName, category, specialties, imageUrl, isPublished, sortOrder } = body;

    // 필수 필드 검증
    if (!name || !companyName) {
      return NextResponse.json({ error: 'Name and company are required' }, { status: 400 });
    }

    // legacyKey 생성 (이름을 소문자로 변환하고 공백을 하이픈으로)
    const legacyKey = name.toLowerCase().replace(/\s+/g, '-');

    const updateData = {
      name,
      position: position || '인증 기업심사관',
      companyName,
      category: category || 'funding',
      specialties: specialties || [],
      imageUrl: imageUrl || '',
      imageAlt: `${name} ${position || '인증 기업심사관'}`,
      sortOrder: sortOrder || 999,
      legacyKey,
      isPublished: isPublished !== false,
      updatedAt: new Date()
    };

    const result = await db.collection('expert-examiners').updateOne(
      { _id: new ObjectId(examinerId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Examiner not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '심사관 정보가 수정되었습니다.'
    });

  } catch (error) {
    console.error('[Admin Examiners API] PUT Error:', error);
    return NextResponse.json(
      { error: 'Failed to update examiner', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/examiners/[id] - 심사관 삭제 (관리자 전용)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    // 현재 로그인한 사용자의 role을 DB에서 확인
    const currentUser = await db.collection('users').findOne({ email: session.user?.email });
    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    const userRole = currentUser.role;

    // 관리자만 접근 가능
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({
        error: 'Forbidden - Admin access required'
      }, { status: 403 });
    }

    const examinerId = params.id;

    // 심사관과 연결된 사용자가 있는지 확인
    const examiner = await db.collection('expert-examiners').findOne({ _id: new ObjectId(examinerId) });

    if (!examiner) {
      return NextResponse.json({ error: 'Examiner not found' }, { status: 404 });
    }

    if (examiner.userId) {
      return NextResponse.json({
        error: '사용자와 연결된 심사관은 삭제할 수 없습니다. 먼저 연결을 해제해주세요.'
      }, { status: 400 });
    }

    // 심사관 삭제
    const result = await db.collection('expert-examiners').deleteOne({ _id: new ObjectId(examinerId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Examiner not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '심사관이 삭제되었습니다.'
    });

  } catch (error) {
    console.error('[Admin Examiners API] DELETE Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete examiner', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
