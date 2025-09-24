import { NextAuthOptions } from 'next-auth';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import clientPromise from '@/lib/mongodb-client';
import NaverProvider from 'next-auth/providers/naver';
import GoogleProvider from 'next-auth/providers/google';
import KakaoProvider from 'next-auth/providers/kakao';
import { UserRole } from '@/types/user.types';

const isProduction = process.env.NODE_ENV === 'production';

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
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
      authorization: {
        url: 'https://nid.naver.com/oauth2.0/authorize',
        params: {
          response_type: 'code',
          client_id: process.env.NAVER_CLIENT_ID!,
          redirect_uri: isProduction
            ? 'https://naraddon.com/api/auth/callback/naver'
            : undefined,
          state: undefined,
        },
      },
      token: {
        url: 'https://nid.naver.com/oauth2.0/token',
      },
      userinfo: {
        url: 'https://openapi.naver.com/v1/nid/me',
      },
      profile(profile) {
        return {
          id: profile.response.id,
          name: profile.response.name || profile.response.nickname || 'Unknown',
          email: profile.response.email || `${profile.response.id}@naver.local`,
          image: profile.response.profile_image,
          role: UserRole.USER,
          mobile: profile.response.mobile?.replace(/-/g, ''),
        };
      },
    }),
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
      try {
        if (!account || !profile) {
          console.error('SignIn error: Missing account or profile');
          return false;
        }

        if (account.provider === 'naver') {
          const naverProfile = profile as any;
          if (!naverProfile.response?.id) {
            console.error('Invalid Naver profile data');
            return false;
          }
        }

        return true;
      } catch (error) {
        console.error('SignIn callback error:', error);
        return false;
      }
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
};