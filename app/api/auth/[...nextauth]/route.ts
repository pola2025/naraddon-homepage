import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import clientPromise from '@/lib/mongodb-client';

// authOptions export 추가 (다른 파일에서 사용)
export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: 'naver',
      name: 'Naver',
      type: 'oauth',
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
      // 네이버 OAuth URL 설정
      authorization: {
        url: 'https://nid.naver.com/oauth2.0/authorize',
        params: {
          response_type: 'code',
          state: 'STATE_STRING',
        },
      },
      token: 'https://nid.naver.com/oauth2.0/token',
      userinfo: 'https://openapi.naver.com/v1/nid/me',
      // 프로필 매핑
      profile(profile: any) {
        console.log('[Naver Profile Response]:', profile);
        return {
          id: profile.response?.id,
          name: profile.response?.name || profile.response?.nickname,
          email: profile.response?.email,
          image: profile.response?.profile_image,
          // 추가 필드 매핑
          mobile: profile.response?.mobile,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.provider = 'naver';
        token.providerId = profile.response?.id;
      }

      // 항상 DB에서 최신 role 가져오기 (관리자 권한 변경 반영)
      if (token.email) {
        try {
          const client = await clientPromise;
          const db = client.db('naraddon');
          const user = await db.collection('users').findOne({ email: token.email });

          console.log('[NextAuth JWT] Fetching role for:', token.email);
          console.log('[NextAuth JWT] User from DB:', user ? { email: user.email, role: user.role } : 'NOT FOUND');

          if (user) {
            token.role = user.role || 'user';
            token.id = user._id?.toString();
            console.log('[NextAuth JWT] Token role set to:', token.role);
          } else {
            token.role = 'user';
            console.log('[NextAuth JWT] User not found, setting role to: user');
          }
        } catch (error) {
          console.error('[NextAuth JWT] Error fetching user role:', error);
          token.role = 'user';
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).provider = token.provider;
        (session.user as any).providerId = token.providerId;
        (session.user as any).role = token.role || 'user';
        (session.user as any).id = token.id;

        console.log('[NextAuth Session] User role in session:', (session.user as any).role);
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET!,
  session: {
    strategy: 'jwt',
  },
  // 개발 환경에서만 디버깅 활성화
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };