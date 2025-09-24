import { NextRequest, NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import clientPromise from '@/lib/mongodb-client';

// 환경변수 검증
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET is not configured');
}

export const authOptions: NextAuthOptions = {
  adapter: process.env.MONGODB_URI ? MongoDBAdapter(clientPromise) : undefined,
  providers: [
    {
      id: 'naver',
      name: 'Naver',
      type: 'oauth',
      authorization: {
        url: 'https://nid.naver.com/oauth2.0/authorize',
        params: {
          response_type: 'code',
        }
      },
      token: {
        url: 'https://nid.naver.com/oauth2.0/token',
        params: {
          grant_type: 'authorization_code',
          client_id: process.env.NAVER_CLIENT_ID!,
          client_secret: process.env.NAVER_CLIENT_SECRET!,
        }
      },
      userinfo: 'https://openapi.naver.com/v1/nid/me',
      client: {
        id: process.env.NAVER_CLIENT_ID!,
        secret: process.env.NAVER_CLIENT_SECRET!,
      },
      profile(profile: any) {
        const data = profile.response || profile;
        return {
          id: data.id,
          name: data.name || data.nickname || 'User',
          email: data.email || `${data.id}@naver.user`,
          image: data.profile_image,
        };
      },
    },
  ],
  callbacks: {
    async signIn() {
      return true;
    },
    async jwt({ token, account, user }) {
      if (account && user) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).provider = token.provider;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };