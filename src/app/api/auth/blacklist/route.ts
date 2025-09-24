import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';
import { getToken } from 'next-auth/jwt';

// 토큰 블랙리스트 관리
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });

    if (!token) {
      return NextResponse.json({ error: 'No token found' }, { status: 400 });
    }

    // MongoDB에 블랙리스트 토큰 저장
    const client = await clientPromise;
    const db = client.db('naraddon');

    await db.collection('blacklisted_tokens').insertOne({
      jti: token.sessionId || `${token.email}-${Date.now()}`,
      email: token.email,
      blacklistedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30일 후 자동 삭제
    });

    // 블랙리스트에 추가된 지 30일 지난 토큰 정리
    await db.collection('blacklisted_tokens').deleteMany({
      expiresAt: { $lt: new Date() }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to blacklist token:', error);
    return NextResponse.json(
      { error: 'Failed to blacklist token' },
      { status: 500 }
    );
  }
}

// 토큰이 블랙리스트에 있는지 확인
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });

    if (!token) {
      return NextResponse.json({ blacklisted: true });
    }

    const client = await clientPromise;
    const db = client.db('naraddon');

    const blacklisted = await db.collection('blacklisted_tokens').findOne({
      $or: [
        { jti: token.sessionId },
        { email: token.email, blacklistedAt: { $gte: new Date(Date.now() - 60000) } } // 1분 이내 블랙리스트
      ]
    });

    return NextResponse.json({ blacklisted: !!blacklisted });
  } catch (error) {
    console.error('Failed to check blacklist:', error);
    return NextResponse.json({ blacklisted: false });
  }
}