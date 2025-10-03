import { NextResponse } from 'next/server';

export async function GET() {
  // Only show in development or with secret header
  const isDev = process.env.NODE_ENV !== 'production';

  if (!isDev) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const envCheck = {
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ? 'Set' : 'MISSING',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'Set' : 'MISSING',
    NAVER_CLIENT_ID: process.env.NAVER_CLIENT_ID ? `Set (${process.env.NAVER_CLIENT_ID?.substring(0, 5)}...)` : 'MISSING',
    NAVER_CLIENT_SECRET: process.env.NAVER_CLIENT_SECRET ? 'Set' : 'MISSING',
    MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'MISSING',
  };

  return NextResponse.json(envCheck);
}