import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';

/**
 * GET /api/debug/mongodb - MongoDB 연결 상태 디버깅
 *
 * @purpose 프로덕션 환경에서 MongoDB 연결 문제 진단
 * @security 프로덕션에서는 반드시 삭제해야 함
 */
export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL,
    mongodbUriExists: !!process.env.MONGODB_URI,
    mongodbUriPrefix: process.env.MONGODB_URI?.substring(0, 20) + '...',
  };

  try {
    console.log('[MongoDB Debug] Starting connection test...');

    const client = await clientPromise;
    diagnostics.connectionStatus = 'success';

    // DB 접근 테스트
    const db = client.db('naraddon');
    const collections = await db.listCollections().toArray();
    diagnostics.collections = collections.map(c => c.name);

    // expert-examiners 컬렉션 테스트
    const examinersCount = await db.collection('expert-examiners').countDocuments();
    diagnostics.expertExaminersCount = examinersCount;

    // users 컬렉션 테스트
    const usersCount = await db.collection('users').countDocuments();
    diagnostics.usersCount = usersCount;

    console.log('[MongoDB Debug] All tests passed');

    return NextResponse.json({
      success: true,
      ...diagnostics
    });
  } catch (error: any) {
    console.error('[MongoDB Debug] Connection failed:', error);

    diagnostics.connectionStatus = 'failed';
    diagnostics.error = {
      message: error.message,
      code: error.code,
      name: error.name,
    };

    return NextResponse.json({
      success: false,
      ...diagnostics
    }, { status: 500 });
  }
}
