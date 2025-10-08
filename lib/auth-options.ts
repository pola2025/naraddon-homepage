import type { NextAuthOptions } from 'next-auth';
import clientPromise from '@/lib/mongodb-client';

/**
 * NextAuth 인증 설정
 *
 * @purpose 네이버 OAuth 소셜 로그인 처리 및 사용자 정보 MongoDB 저장
 * @context 사용자가 네이버 계정으로 로그인하면 자동으로 DB에 사용자 정보 저장
 * @decision JWT 전략 사용 (서버리스 환경 최적화)
 */
export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: 'naver',
      name: 'Naver',
      type: 'oauth',
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
      // 네이버 OAuth URL 설정
      authorization: 'https://nid.naver.com/oauth2.0/authorize',
      token: 'https://nid.naver.com/oauth2.0/token',
      userinfo: 'https://openapi.naver.com/v1/nid/me',
      // 프로필 매핑
      profile(profile: any) {
        return {
          id: profile.response?.id,
          name: profile.response?.name,
          email: profile.response?.email,
          image: profile.response?.profile_image,
        };
      },
    },
  ],
  callbacks: {
    /**
     * 로그인 시 사용자 정보를 MongoDB에 저장
     *
     * @purpose 소셜 로그인 시 사용자 정보를 DB에 자동으로 등록/업데이트
     * @context 첫 로그인 시 신규 사용자 생성, 기존 사용자는 정보 업데이트
     */
    async signIn({ user, account, profile }) {
      try {
        if (!user.email) {
          console.error('[Auth] No email provided');
          return false;
        }

        const client = await clientPromise;
        const db = client.db('naraddon');
        const usersCollection = db.collection('users');

        // 기존 사용자 확인
        const existingUser = await usersCollection.findOne({ email: user.email });

        if (existingUser) {
          // 기존 사용자 업데이트 (최근 로그인 시간 등)
          await usersCollection.updateOne(
            { email: user.email },
            {
              $set: {
                lastLoginAt: new Date(),
                updatedAt: new Date(),
              }
            }
          );
          console.log('[Auth] Updated existing user:', user.email);
        } else {
          // 신규 사용자 생성
          const newUser = {
            email: user.email,
            name: user.name || '사용자',
            provider: account?.provider || 'naver',
            providerId: (profile as any)?.response?.id || user.id,
            role: 'user', // 기본 역할
            status: 'active', // 활성 상태
            profile: {
              image: user.image || '',
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLoginAt: new Date(),
          };

          await usersCollection.insertOne(newUser);
          console.log('[Auth] Created new user:', user.email);
        }

        return true;
      } catch (error) {
        console.error('[Auth] Error in signIn callback:', error);
        return false;
      }
    },
    async jwt({ token, account, profile, user }) {
      if (account && profile) {
        token.provider = 'naver';
        token.providerId = profile.response?.id;
      }
      if (user) {
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).provider = token.provider;
        (session.user as any).providerId = token.providerId;

        // MongoDB에서 사용자 role 가져오기
        try {
          const client = await clientPromise;
          const db = client.db('naraddon');
          const user = await db.collection('users').findOne({ email: token.email as string });
          if (user) {
            (session.user as any).role = user.role;
            (session.user as any).id = user._id.toString();
          }
        } catch (error) {
          console.error('[Auth] Error fetching user role:', error);
        }
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
  // 디버그 활성화
  debug: true,
};