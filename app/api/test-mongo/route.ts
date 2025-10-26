import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';

/**
 * GET /api/test-mongo - MongoDB 연결 테스트 (임시)
 */
export async function GET() {
  const result: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL,
    mongoUriExists: !!process.env.MONGODB_URI,
    mongoUriPrefix: process.env.MONGODB_URI?.substring(0, 25) + '...'
  };

  try {
    const client = await clientPromise;
    const db = client.db('naraddon');

    // 컬렉션 목록
    const collections = await db.listCollections().toArray();
    result.collections = collections.length;

    // expert-examiners 카운트
    const count = await db.collection('expert-examiners').countDocuments();
    result.expertExaminersCount = count;

    result.status = 'SUCCESS';

    return NextResponse.json(result);
  } catch (error: any) {
    result.status = 'ERROR';
    result.error = {
      message: error.message,
      code: error.code,
      name: error.name
    };

    return NextResponse.json(result, { status: 500 });
  }
}
