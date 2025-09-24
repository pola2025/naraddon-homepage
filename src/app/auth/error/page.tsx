'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    Configuration: '서버 설정 문제가 있습니다. 잠시 후 다시 시도해주세요.',
    AccessDenied: '접근이 거부되었습니다.',
    Verification: '인증 토큰이 만료되었거나 이미 사용되었습니다.',
    OAuthSignin: '소셜 로그인 연결에 실패했습니다.',
    OAuthCallback: '소셜 로그인 인증에 실패했습니다.',
    OAuthCreateAccount: '계정 생성에 실패했습니다.',
    EmailCreateAccount: '이메일 계정 생성에 실패했습니다.',
    Callback: '인증 콜백 처리에 실패했습니다.',
    OAuthAccountNotLinked: '이미 다른 방법으로 가입된 이메일입니다.',
    EmailSignin: '이메일 전송에 실패했습니다.',
    CredentialsSignin: '로그인 정보가 올바르지 않습니다.',
    SessionRequired: '이 페이지에 접근하려면 로그인이 필요합니다.',
    Default: '로그인 중 오류가 발생했습니다.'
  };

  const errorMessage = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-4">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
          </div>

          <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
            로그인 오류
          </h2>

          <p className="mt-2 text-center text-sm text-gray-600">
            {errorMessage}
          </p>

          {error && (
            <p className="mt-1 text-center text-xs text-gray-500">
              오류 코드: {error}
            </p>
          )}

          <div className="mt-8 space-y-3">
            <Link
              href="/auth/login"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              다시 로그인하기
            </Link>

            <Link
              href="/"
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              홈으로 돌아가기
            </Link>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              문제가 계속되면 관리자에게 문의해주세요
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}