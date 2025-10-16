/**
 * 디버그용: 현재 세션 정보 확인
 *
 * @usage GET /api/debug-session
 * @warning 프로덕션에서는 제거 필요
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { loadEffectivePermissions } from '@/lib/rbac/permissions';

export async function GET(request: NextRequest) {
  try {
    // 1. NextAuth 세션 확인
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({
        hasSession: false,
        message: '세션이 없습니다. 로그인이 필요합니다.',
      });
    }

    // 2. 사용자 정보
    const userId = session.user?.id;
    const userEmail = session.user?.email;
    const userName = session.user?.name;

    // 3. 권한 로드
    let permissions: string[] = [];
    let permissionLoadError = null;

    if (userId) {
      try {
        const perms = await loadEffectivePermissions(userId);
        permissions = Array.from(perms);
      } catch (error) {
        permissionLoadError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // 4. 응답
    return NextResponse.json({
      hasSession: true,
      user: {
        id: userId,
        email: userEmail,
        name: userName,
      },
      permissions: {
        count: permissions.length,
        list: permissions.sort(),
        loadError: permissionLoadError,
      },
      checks: {
        canWritePolicyAnalysis: permissions.includes('policy:analysis:write'),
        canWritePolicyNews: permissions.includes('policy:news:write'),
        canManagePosts: permissions.includes('community:post:manage'),
      },
    });

  } catch (error) {
    console.error('[debug-session] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
