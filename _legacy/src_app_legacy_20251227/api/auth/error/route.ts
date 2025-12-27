import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const error = searchParams.get('error');

  console.log('Auth error endpoint hit:', { error, url: request.url });

  // 클라이언트 페이지로 리다이렉트
  return NextResponse.redirect(new URL(`/auth/error?error=${error || 'Unknown'}`, request.url));
}

export async function POST(request: NextRequest) {
  return GET(request);
}