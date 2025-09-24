import NextAuth, { NextAuthOptions } from 'next-auth';
import type { OAuthConfig } from 'next-auth/providers';
// MongoDB adapter는 조건부로 import
let MongoDBAdapter: any = null;
let clientPromise: any = null;

try {
  if (process.env.MONGODB_URI) {
    MongoDBAdapter = require('@next-auth/mongodb-adapter').MongoDBAdapter;
    clientPromise = require('@/lib/mongodb-client').default;
  }
} catch (error) {
  console.error('MongoDB setup error:', error);
}
import crypto from 'crypto';

// 환경변수 검증
const requiredEnvVars = {
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NAVER_CLIENT_ID: process.env.NAVER_CLIENT_ID,
  NAVER_CLIENT_SECRET: process.env.NAVER_CLIENT_SECRET,
};

// 프로덕션에서만 검증
if (process.env.NODE_ENV === 'production') {
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      console.error(`Missing required environment variable: ${key}`);
    }
  }
}

// --- Naver Provider (Custom OAuth2) ---
const NaverProvider: OAuthConfig<any> = {
  id: 'naver',
  name: 'Naver',
  type: 'oauth',
  wellKnown: undefined,
  authorization: {
    url: 'https://nid.naver.com/oauth2.0/authorize',
    params: { response_type: 'code' },
  },
  token: {
    url: 'https://nid.naver.com/oauth2.0/token',
    params: { grant_type: 'authorization_code' },
  },
  userinfo: 'https://openapi.naver.com/v1/nid/me',
  clientId: process.env.NAVER_CLIENT_ID!,
  clientSecret: process.env.NAVER_CLIENT_SECRET!,
  profile: (profile: any) => {
    // Naver 응답: { resultcode, message, response: { id, email, name, nickname, profile_image, mobile, ... } }
    // 프로필 정보 로깅 제거 (보안상 민감정보 노출 방지)
    const p = profile?.response ?? {};
    return {
      id: p.id,
      name: p.name || p.nickname || '네이버 사용자',
      email: p.email || `${p.id}@naver.local`,
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
  clientId: process.env.KAKAO_CLIENT_ID!,
  clientSecret: process.env.KAKAO_CLIENT_SECRET, // 대개 불필요하면 undefined 가능
  profile: (profile: any) => {
    // Kakao 응답: { id, kakao_account: { email, profile: { nickname, profile_image_url } } }
    const acc = profile?.kakao_account ?? {};
    const prof = acc.profile ?? {};
    return {
      id: String(profile.id),
      name: prof.nickname || '카카오 사용자',
      email: acc.email || `${profile.id}@kakao.local`,
      image: prof.profile_image_url ?? null,
      provider: 'kakao',
    };
  },
};

export const authOptions: NextAuthOptions = {
  // MongoDB adapter는 조건부로 사용
  ...(MongoDBAdapter && clientPromise ? { adapter: MongoDBAdapter(clientPromise) } : {}),
  providers: [
    NaverProvider,
    KakaoProvider,
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
      // MongoDB가 없으면 바로 로그인 허용
      if (!clientPromise) {
        console.log('MongoDB not configured, using JWT-only session');
        return true;
      }

      try {
        // MongoDB 연결 확인
        let usersCollection;
        try {
          const client = await clientPromise;
          const db = client.db('naraddon');
          usersCollection = db.collection('users');
        } catch (dbError) {
          console.error('MongoDB connection error in signIn:', dbError);
          // DB 연결 실패해도 로그인은 허용 (JWT 세션 사용)
          return true;
        }

        // 네이버 로그인 시 자동 회원가입 처리
        if (account?.provider === 'naver') {
          // 보안상 민감한 정보는 로깅하지 않음
          const naverProfile = profile as any;
          const userData = naverProfile?.response || {};

          // 네이버 고유 ID 확인 (중요!)
          if (!userData.id) {
            console.error('Naver ID is missing from profile');
            return false;
          }

          // 동시 로그인 방지 - findOneAndUpdate로 atomic 처리
          const previousSession = await usersCollection.findOneAndUpdate(
            { providerId: userData.id },
            {
              $set: {
                isLoggedIn: false,
                lastLogoutAt: new Date()
              }
            },
            { returnDocument: 'before' }
          );

          // 다른 이메일로 이미 로그인되어 있었다면 경고 (로깅 없이)
          if (previousSession && previousSession.email !== userData.email) {
            // 이전 세션이 무효화됨
          }

          // 사용자 정보 자동 저장 (추가 입력 없음)
          user.id = userData.id; // 네이버 고유 ID 사용
          user.name = userData.name || userData.nickname || '네이버 사용자';
          user.email = userData.email || `${userData.id}@naver.local`;
          user.image = userData.profile_image || null;

          // 추가 정보 저장 (mobile 등)
          (user as any).mobile = userData.mobile || userData.mobile_e164 || null;
          (user as any).provider = 'naver';
          (user as any).providerId = userData.id;
          (user as any).role = 'user';

          // DB에서 기존 사용자 확인 - providerId로 검색
          const existingUser = await usersCollection.findOne({
            $or: [
              { email: user.email },
              { providerId: userData.id }
            ]
          });

          if (!existingUser) {
            // 신규 사용자인 경우 createdAt 추가
            await usersCollection.insertOne({
              email: user.email,
              name: user.name,
              image: user.image,
              provider: 'naver',
              providerId: userData.id,
              role: 'user',
              mobile: (user as any).mobile,
              createdAt: new Date(),
              updatedAt: new Date(),
              lastLoginAt: new Date(),
              isLoggedIn: true // 신규 가입 시 로그인 상태
            });
          } else {
            // 기존 사용자는 정보 업데이트
            await usersCollection.updateOne(
              {
                $or: [
                  { email: user.email },
                  { providerId: userData.id }
                ]
              },
              {
                $set: {
                  lastLoginAt: new Date(),
                  updatedAt: new Date(),
                  providerId: userData.id, // providerId 업데이트
                  name: user.name,
                  image: user.image,
                  isLoggedIn: true // 로그인 상태 설정
                }
              }
            );
          }

          // 사용자 정보 로깅 제거 (보안)
        }

        // 카카오 로그인 시 자동 회원가입 처리
        if (account?.provider === 'kakao') {
          const kakaoProfile = profile as any;
          const acc = kakaoProfile?.kakao_account || {};
          const prof = acc.profile || {};

          user.name = prof.nickname || '카카오 사용자';
          user.email = acc.email || `${kakaoProfile.id}@kakao.local`;
          user.image = prof.profile_image_url || null;
          (user as any).provider = 'kakao';
          (user as any).role = 'user';

          // DB에서 기존 사용자 확인
          const existingUser = await usersCollection.findOne({ email: user.email });

          if (!existingUser) {
            // 신규 사용자인 경우 createdAt 추가
            await usersCollection.insertOne({
              email: user.email,
              name: user.name,
              image: user.image,
              provider: 'kakao',
              role: 'user',
              createdAt: new Date(),
              updatedAt: new Date(),
              lastLoginAt: new Date()
            });
          } else {
            // 기존 사용자는 lastLoginAt만 업데이트
            await usersCollection.updateOne(
              { email: user.email },
              {
                $set: {
                  lastLoginAt: new Date(),
                  updatedAt: new Date()
                }
              }
            );
          }
        }
      } catch (error) {
        console.error('SignIn callback error:', error);
      }

      return true; // 자동으로 로그인 승인
    },
    async jwt({ token, user, account, profile }) {
      // 블랙리스트 체크는 MongoDB가 있고 새로운 로그인이 아닐 때만 수행
      if (token?.email && !account && clientPromise) {
        try {
          const client = await clientPromise;
          if (client) {
            const db = client.db('naraddon');
            const blacklisted = await db.collection('blacklisted_tokens').findOne({
              email: token.email,
              blacklistedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            });

            if (blacklisted) {
              // 블랙리스트에 있으면 토큰 무효화
              return null;
            }
          }
        } catch (error) {
          console.error('Blacklist check error in JWT callback:', error);
          // 에러 발생 시에도 진행 (프로덕션 안정성)
        }
      }

      // 최초 로그인 시 provider 정보 보강
      if (account && user) {
        // 새로운 로그인 시 완전히 새로운 토큰 생성
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
    },
    async session({ session, token }) {
      // 클라이언트에서 provider 확인이 필요하면 세션에 반영
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        (session.user as any).provider = token.provider;
        (session.user as any).providerId = token.providerId;
        (session.user as any).role = token.role;
        (session.user as any).mobile = token.mobile;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
    newUser: '/mypage', // 신규 가입자도 마이페이지로 리디렉션
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false, // 프로덕션에서는 비활성화
};

// NextAuth 핸들러 생성 - try-catch로 에러 핸들링
let handler;
try {
  handler = NextAuth(authOptions);
} catch (error) {
  console.error('NextAuth initialization error:', error);
  // 에러 발생 시 기본 응답 반환
  handler = async (req: any, res: any) => {
    return new Response(JSON.stringify({ error: 'Authentication service error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

// GET과 POST 모두 동일한 핸들러 사용
export { handler as GET, handler as POST };
