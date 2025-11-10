import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db('naraddon');

    // ObjectId 유효성 검증
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid expert ID' },
        { status: 400 }
      );
    }

    const expert = await db.collection('experts').findOne({
      _id: new ObjectId(params.id),
      isActive: true
    });

    if (!expert) {
      return NextResponse.json(
        { success: false, error: 'Expert not found' },
        { status: 404 }
      );
    }

    // imageUrl 생성 (imageKey가 있는 경우)
    if (expert.imageKey && !expert.imageUrl) {
      const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
      expert.imageUrl = `${R2_PUBLIC_URL}/${expert.imageKey}.png`;
    }

    return NextResponse.json({
      success: true,
      expert: {
        ...expert,
        _id: expert._id.toString()
      }
    });
  } catch (error) {
    console.error('Failed to fetch expert:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expert' },
      { status: 500 }
    );
  }
}
