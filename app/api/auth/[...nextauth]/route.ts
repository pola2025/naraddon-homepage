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
          client_id: process.env.NAVER_CLIENT_ID!,
        }
      },
      token: 'https://nid.naver.com/oauth2.0/token',
      userinfo: 'https://openapi.naver.com/v1/nid/me',
      // 프로필 매핑
      profile(profile: any) {
        console.log('[Naver Profile]:', JSON.stringify(profile, null, 2));

        // 네이버 API 응답 구조 처리
        const userData = profile.response || profile;

        return {
          id: userData.id,
          name: userData.name || userData.nickname || 'Unknown',
          email: userData.email || `naver_${userData.id}@naraddon.com`,
          image: userData.profile_image,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        console.log('[NextAuth JWT] Account:', account);
        console.log('[NextAuth JWT] Profile:', profile);

        token.provider = account.provider;
        // profile은 이미 provider의 profile 함수에서 변환된 데이터
        token.providerId = profile.id;
      }

      // DB에서 사용자 역할 가져오기
      if (token.email) {
        try {
          const client = await clientPromise;
          const db = client.db('naraddon');
          const user = await db.collection('users').findOne({ email: token.email });

          if (user) {
            token.role = user.role || 'user';
            token.id = user._id?.toString();
          } else {
            token.role = 'user';
          }
        } catch (error) {
          console.error('[NextAuth JWT] Error:', error);
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
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      console.log('[NextAuth SignIn] User:', user);
      console.log('[NextAuth SignIn] Account:', account);
      console.log('[NextAuth SignIn] Profile:', profile);

      // MongoDB에 사용자 정보 저장/업데이트
      if (user.email) {
        try {
          const client = await clientPromise;
          const db = client.db('naraddon');

          await db.collection('users').updateOne(
            { email: user.email },
            {
              $set: {
                email: user.email,
                name: user.name,
                image: user.image,
                provider: account?.provider,
                providerId: profile?.id,
                lastLoginAt: new Date(),
              },
              $setOnInsert: {
                role: 'user',
                createdAt: new Date(),
              }
            },
            { upsert: true }
          );
        } catch (error) {
          console.error('[NextAuth SignIn] DB Error:', error);
        }
      }

      return true;
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
  // 디버그 활성화 (임시)
  debug: true,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };