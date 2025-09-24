import { NextAuthOptions } from 'next-auth';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import clientPromise from '@/lib/mongodb-client';
import NaverProvider from 'next-auth/providers/naver';
import GoogleProvider from 'next-auth/providers/google';
import KakaoProvider from 'next-auth/providers/kakao';
import { UserRole } from '@/types/user.types';

const isProduction = process.env.NODE_ENV === 'production';

// Validate environment variables
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID?.trim();
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET?.trim();

if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
  console.error('❌ Naver OAuth configuration error:');
  console.error('NAVER_CLIENT_ID:', NAVER_CLIENT_ID ? 'Set' : 'MISSING');
  console.error('NAVER_CLIENT_SECRET:', NAVER_CLIENT_SECRET ? 'Set' : 'MISSING');
  console.error('Please check Vercel environment variables');
} else {
  console.log('✅ Naver OAuth configured successfully');
  console.log('NAVER_CLIENT_ID:', NAVER_CLIENT_ID.substring(0, 5) + '...');
}

const getMongoAdapter = async () => {
  try {
    const client = await clientPromise;
    if (client && client.db) {
      return MongoDBAdapter(clientPromise);
    }
  } catch (error) {
    console.error('MongoDB connection failed:', error);
  }
  return undefined;
};

export const authOptions: NextAuthOptions = {
  adapter: process.env.MONGODB_URI ? MongoDBAdapter(clientPromise) : undefined,
  providers: [
    ...(NAVER_CLIENT_ID && NAVER_CLIENT_SECRET ? [
      NaverProvider({
        clientId: NAVER_CLIENT_ID,
        clientSecret: NAVER_CLIENT_SECRET,
        authorization: {
          url: "https://nid.naver.com/oauth2.0/authorize",
          params: {
            response_type: "code",
            client_id: NAVER_CLIENT_ID,
            redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/naver`,
            state: "{state}",
          }
        },
        token: "https://nid.naver.com/oauth2.0/token",
        userinfo: "https://openapi.naver.com/v1/nid/me",
        profile(profile) {
          return {
            id: profile.response?.id,
            name: profile.response?.name || profile.response?.nickname,
            email: profile.response?.email,
            image: profile.response?.profile_image,
          }
        },
      })
    ] : []),
    // Google과 Kakao는 나중에 설정
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
    // KakaoProvider({
    //   clientId: process.env.KAKAO_CLIENT_ID!,
    //   clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    // }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user, account }) {
      try {
        if (user) {
          token.id = user.id;
          token.role = user.role || UserRole.USER;
          token.mobile = user.mobile;
        }
        if (account) {
          token.provider = account.provider;
        }
        return token;
      } catch (error) {
        console.error('JWT callback error:', error);
        return token;
      }
    },
    async session({ session, token }) {
      try {
        if (session.user) {
          session.user.id = token.id as string;
          session.user.role = token.role as UserRole;
          session.user.mobile = token.mobile as string;
          session.user.provider = token.provider as string;
        }
        return session;
      } catch (error) {
        console.error('Session callback error:', error);
        return session;
      }
    },
    async signIn({ user, account, profile }) {
      console.log('SignIn attempt:', account?.provider);
      return true;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV !== 'production',
};