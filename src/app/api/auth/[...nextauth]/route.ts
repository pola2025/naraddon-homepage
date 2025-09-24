import { NextRequest, NextResponse } from 'next/server';
import NextAuth, { NextAuthOptions } from 'next-auth';
import type { OAuthConfig } from 'next-auth/providers';
import crypto from 'crypto';

// MongoDB adapter는 조건부로 import
let MongoDBAdapter: any = null;
let clientPromise: any = null;

// MongoDB 설정은 try-catch로 감싸서 에러 방지
if (process.env.MONGODB_URI) {
  try {
    MongoDBAdapter = require('@next-auth/mongodb-adapter').MongoDBAdapter;
    clientPromise = require('@/lib/mongodb-client').default;
  } catch (error) {
    console.error('MongoDB setup error (non-critical):', error);
  }
}

// 환경변수 검증
const requiredEnvVars = {
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'https://naraddon.com',
  NAVER_CLIENT_ID: process.env.NAVER_CLIENT_ID,
  NAVER_CLIENT_SECRET: process.env.NAVER_CLIENT_SECRET,
};

// 환경변수 유효성 검사
const validateEnvVars = () => {
  const missing = [];
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      missing.push(key);
    }
  }
  return missing;
};

const missingVars = validateEnvVars();
if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// --- Naver Provider (Custom OAuth2) ---
const NaverProvider: OAuthConfig<any> = {
  id: 'naver',
  name: 'Naver',
  type: 'oauth',
  wellKnown: undefined,
  authorization: {
    url: 'https://nid.naver.com/oauth2.0/authorize',
    params: {
      response_type: 'code',
      state: undefined, // NextAuth가 자동 생성
    },
  },
  token: {
    url: 'https://nid.naver.com/oauth2.0/token',
    params: { grant_type: 'authorization_code' },
  },
  userinfo: 'https://openapi.naver.com/v1/nid/me',
  clientId: process.env.NAVER_CLIENT_ID || '',
  clientSecret: process.env.NAVER_CLIENT_SECRET || '',
  profile: (profile: any) => {
    const p = profile?.response ?? {};
    return {
      id: p.id || `naver_${Date.now()}`,
      name: p.name || p.nickname || '네이버 사용자',
      email: p.email || `${p.id || Date.now()}@naver.local`,
      image: p.profile_image || null,
      mobile: p.mobile || p.mobile_e164 || null,
      provider: 'naver',
    };
  },
};

// --- Kakao Provider (Custom OAuth2) ---
const KakaoProvider: OAuthConfig<any> = {
  id: 'kakao',
  name: 'Kakao',
  type: 'oauth',
  authorization: {
    url: 'https://kauth.kakao.com/oauth/authorize',
    params: { response_type: 'code' },
  },
  token: 'https://kauth.kakao.com/oauth/token',
  userinfo: 'https://kapi.kakao.com/v2/user/me',
  clientId: process.env.KAKAO_CLIENT_ID || '',
  clientSecret: process.env.KAKAO_CLIENT_SECRET,
  profile: (profile: any) => {
    const acc = profile?.kakao_account ?? {};
    const prof = acc.profile ?? {};
    return {
      id: String(profile.id || `kakao_${Date.now()}`),
      name: prof.nickname || '카카오 사용자',
      email: acc.email || `${profile.id || Date.now()}@kakao.local`,
      image: prof.profile_image_url ?? null,
      provider: 'kakao',
    };
  },
};

// NextAuth 옵션 정의
export const authOptions: NextAuthOptions = {
  // MongoDB adapter는 조건부로 사용
  ...(MongoDBAdapter && clientPromise ? { adapter: MongoDBAdapter(clientPromise) } : {}),
  providers: [
    NaverProvider,
    // KakaoProvider는 API 키가 있을 때만 활성화
    ...(process.env.KAKAO_CLIENT_ID ? [KakaoProvider] : []),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // MongoDB가 없으면 바로 로그인 허용
        if (!clientPromise) {
          return true;
        }

        // MongoDB 연결 시도
        const client = await clientPromise;
        if (!client || !client.db) {
          return true; // DB 연결 실패해도 로그인 허용
        }

        const db = client.db('naraddon');
        const usersCollection = db.collection('users');

        // 네이버 로그인 처리
        if (account?.provider === 'naver') {
          const naverProfile = profile as any;
          const userData = naverProfile?.response || {};

          if (!userData.id) {
            console.error('Naver ID is missing');
            return false;
          }

          // 사용자 정보 설정
          user.id = userData.id;
          user.name = userData.name || userData.nickname || '네이버 사용자';
          user.email = userData.email || `${userData.id}@naver.local`;
          user.image = userData.profile_image || null;

          // 추가 정보 저장
          (user as any).mobile = userData.mobile || userData.mobile_e164 || null;
          (user as any).provider = 'naver';
          (user as any).providerId = userData.id;
          (user as any).role = 'user';

          // DB 업데이트
          await usersCollection.updateOne(
            { providerId: userData.id },
            {
              $set: {
                email: user.email,
                name: user.name,
                image: user.image,
                provider: 'naver',
                providerId: userData.id,
                role: 'user',
                mobile: (user as any).mobile,
                updatedAt: new Date(),
                lastLoginAt: new Date(),
                isLoggedIn: true,
              },
              $setOnInsert: {
                createdAt: new Date(),
              }
            },
            { upsert: true }
          );
        }

        // 카카오 로그인 처리
        if (account?.provider === 'kakao') {
          const kakaoProfile = profile as any;
          const acc = kakaoProfile?.kakao_account || {};
          const prof = acc.profile || {};

          user.id = String(kakaoProfile.id);
          user.name = prof.nickname || '카카오 사용자';
          user.email = acc.email || `${kakaoProfile.id}@kakao.local`;
          user.image = prof.profile_image_url || null;
          (user as any).provider = 'kakao';
          (user as any).providerId = String(kakaoProfile.id);
          (user as any).role = 'user';

          await usersCollection.updateOne(
            { providerId: String(kakaoProfile.id) },
            {
              $set: {
                email: user.email,
                name: user.name,
                image: user.image,
                provider: 'kakao',
                providerId: String(kakaoProfile.id),
                role: 'user',
                updatedAt: new Date(),
                lastLoginAt: new Date(),
                isLoggedIn: true,
              },
              $setOnInsert: {
                createdAt: new Date(),
              }
            },
            { upsert: true }
          );
        }
      } catch (error) {
        console.error('SignIn callback error:', error);
        // 에러가 발생해도 로그인은 허용
        return true;
      }

      return true;
    },
    async jwt({ token, user, account, profile }) {
      try {
        // 블랙리스트 체크 (MongoDB가 있을 때만)
        if (token?.email && !account && clientPromise) {
          try {
            const client = await clientPromise;
            if (client && client.db) {
              const db = client.db('naraddon');
              const blacklisted = await db.collection('blacklisted_tokens').findOne({
                email: token.email,
                blacklistedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
              });

              if (blacklisted) {
                return null;
              }
            }
          } catch (error) {
            // 블랙리스트 체크 실패해도 진행
          }
        }

        // 최초 로그인 시 토큰 생성
        if (account && user) {
          token = {
            id: user.id,
            email: user.email,
            name: user.name,
            provider: account.provider,
            providerId: account.providerAccountId,
            role: (user as any).role || 'user',
            mobile: (user as any).mobile,
            sessionId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          };
        }

        return token;
      } catch (error) {
        console.error('JWT callback error:', error);
        return token;
      }
    },
    async session({ session, token }) {
      try {
        if (session.user && token) {
          session.user.id = token.id as string;
          session.user.email = token.email as string;
          session.user.name = token.name as string;
          (session.user as any).provider = token.provider;
          (session.user as any).providerId = token.providerId;
          (session.user as any).role = token.role;
          (session.user as any).mobile = token.mobile;
        }
      } catch (error) {
        console.error('Session callback error:', error);
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
    newUser: '/mypage',
  },
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development',
  debug: false, // 프로덕션에서는 항상 false
};

// NextAuth 핸들러 생성 - 안전한 방식으로
const createHandler = () => {
  try {
    return NextAuth(authOptions);
  } catch (error: any) {
    console.error('NextAuth initialization error:', error);

    // 에러 핸들러 반환
    return async (req: NextRequest) => {
      const isDevelopment = process.env.NODE_ENV !== 'production';

      return NextResponse.json(
        {
          error: 'Authentication service error',
          message: isDevelopment ? error?.message : undefined,
          details: isDevelopment ? error?.stack : undefined,
          missingEnvVars: isDevelopment ? missingVars : undefined,
        },
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    };
  }
};

// 핸들러 생성
const handler = createHandler();

// GET과 POST 모두 동일한 핸들러 사용
export { handler as GET, handler as POST };