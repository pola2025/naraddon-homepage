import NextAuth, { NextAuthOptions } from 'next-auth';
import type { OAuthConfig } from 'next-auth/providers';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import clientPromise from '@/lib/mongodb-client';

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
    // Naver 응답: { resultcode, message, response: { id, email, name, mobile, ... } }
    const p = profile?.response ?? {};
    return {
      id: p.id,
      name: p.name || p.nickname || '네이버 사용자',
      email: p.email || `${p.id}@naver.local`,
      image: p.profile_image ?? null,
      mobile: p.mobile,
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
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    NaverProvider,
    KakaoProvider,
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user, account, profile }) {
      // 네이버 로그인 시 자동 회원가입 처리
      if (account?.provider === 'naver') {
        const naverProfile = profile as any;
        const userData = naverProfile?.response || {};

        // 사용자 정보 자동 저장 (추가 입력 없음)
        user.name = userData.name || userData.nickname || '네이버 사용자';
        user.email = userData.email || `${userData.id}@naver.local`;
        user.image = userData.profile_image || null;

        // 추가 정보 저장 (mobile 등)
        (user as any).mobile = userData.mobile;
        (user as any).provider = 'naver';
        (user as any).role = 'user';
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
      }


      return true; // 자동으로 로그인 승인
    },
    async jwt({ token, user, account, profile }) {
      // 최초 로그인 시 provider 정보 보강
      if (account) {
        token.provider = account.provider;
        token.providerId = account.providerAccountId;
      }
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as any).role || 'user';
        token.mobile = (user as any).mobile;
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
  debug: true, // 오류 디버깅을 위해 일시적으로 활성화
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
