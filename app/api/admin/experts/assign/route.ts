import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/auth-options';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

/**
 * POST: 전문가와 사용자 계정 연결 (관리자 전용)
 * @purpose 관리자가 전문가 프로필과 사용자 계정을 연결하고 expert 역할 부여
 * @security admin 역할만 접근 가능
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const { expertId, userId } = await request.json();

    if (!expertId || !userId) {
      return NextResponse.json(
        { success: false, error: 'expertId and userId are required' },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(expertId) || !ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('naraddon');

    // 1. 사용자 존재 확인
    const user = await db.collection('users').findOne({
      _id: new ObjectId(userId)
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // 2. 전문가 존재 확인
    const expert = await db.collection('experts').findOne({
      _id: new ObjectId(expertId)
    });

    if (!expert) {
      return NextResponse.json(
        { success: false, error: 'Expert not found' },
        { status: 404 }
      );
    }

    // 3. 사용자에게 expert 역할 부여
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          role: 'expert',
          updatedAt: new Date()
        }
      }
    );

    // 4. 전문가 문서에 userId 연결
    await db.collection('experts').updateOne(
      { _id: new ObjectId(expertId) },
      {
        $set: {
          userId: userId,
          updatedAt: new Date()
        }
      }
    );

    console.log(`[Admin] Expert ${expert.name} linked to user ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Expert successfully linked to user account'
    });
  } catch (error) {
    console.error('Failed to assign expert to user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to assign expert to user' },
      { status: 500 }
    );
  }
}
