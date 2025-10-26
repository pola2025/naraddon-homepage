import type { NextAuthOptions } from 'next-auth';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import clientPromise from '../lib/mongodb-client';

/**
 * NextAuth 인증 설정
 *
 * @purpose 네이버 OAuth 소셜 로그인 처리 및 사용자 정보 MongoDB 저장
 * @context 사용자가 네이버 계정으로 로그인하면 자동으로 DB에 사용자 정보 저장
 * @decision MongoDBAdapter 사용하여 계정 연결 정보 관리 (OAuthAccountNotLinked 해결)
 */
export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: 'naraddon',
  }),
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
        if (!user.email || !account) {
          console.error('[Auth] No email or account provided');
          return false;
        }

        const client = await clientPromise;
        const db = client.db('naraddon');
        const usersCollection = db.collection('users');
        const accountsCollection = db.collection('accounts');

        const mobile = (profile as any)?.response?.mobile || (profile as any)?.response?.mobile_e164;

        // 1. 사용자 확인 및 업데이트
        const existingUser = await usersCollection.findOne({ email: user.email });

        if (existingUser) {
          // 커스텀 필드 업데이트
          const updateData: any = {
            lastLoginAt: new Date(),
          };

          if (mobile) {
            updateData.mobile = mobile;
          }

          if (!existingUser.role) {
            updateData.role = 'user';
          }
          if (!existingUser.status) {
            updateData.status = 'active';
          }

          await usersCollection.updateOne(
            { email: user.email },
            { $set: updateData }
          );

          // 2. accounts 연결 확인 및 생성 (OAuthAccountNotLinked 해결)
          const existingAccount = await accountsCollection.findOne({
            provider: account.provider,
            providerAccountId: account.providerAccountId
          });

          if (!existingAccount) {
            // accounts가 없으면 생성 (기존 사용자 연결)
            await accountsCollection.insertOne({
              userId: existingUser._id.toString(),
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
            });
            console.log('[Auth] Created account link for existing user:', user.email);
          }

          console.log('[Auth] Updated user:', user.email, 'Mobile:', mobile || 'N/A');
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

      // 🔥 FIX: MongoDB에서 role 및 examinerId 조회하여 token에 저장
      if (token.email) {
        try {
          const client = await clientPromise;
          const db = client.db('naraddon');
          const dbUser = await db.collection('users').findOne(
            { email: token.email as string },
            { projection: { role: 1, _id: 1 } }
          );
          if (dbUser) {
            token.role = dbUser.role || 'user';
            token.id = dbUser._id.toString();
            console.log('[JWT Callback] Role set from DB:', token.role);

            // 🔥 심사관인 경우 examinerId 조회 (브랜드 페이지 접근용)
            if (dbUser.role === 'examiner' && !token.examinerId) {
              try {
                const expertExaminer = await db.collection('expert-examiners').findOne(
                  { $or: [{ email: token.email as string }, { userId: dbUser._id.toString() }] },
                  { projection: { _id: 1 } }
                );
                if (expertExaminer) {
                  token.examinerId = expertExaminer._id.toString();
                  console.log('[JWT Callback] ExaminerId set from DB:', token.examinerId);
                } else {
                  console.warn('[JWT Callback] ExpertExaminer not found for email:', token.email);
                }
              } catch (examinerError) {
                console.error('[JWT Callback] Error fetching examinerId:', examinerError);
                // examinerId 조회 실패해도 로그인은 계속 진행
              }
            }
          }
        } catch (error) {
          console.error('[JWT Callback] Error fetching role:', error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).provider = token.provider;
        (session.user as any).providerId = token.providerId;

        // JWT 토큰에서 role 가져오기 (이미 JWT 콜백에서 DB 조회함)
        (session.user as any).role = token.role || 'user';
        (session.user as any).id = token.id;

        // 🔥 심사관인 경우 examinerId 포함 (브랜드 페이지 접근용)
        if (token.examinerId) {
          (session.user as any).examinerId = token.examinerId;
          console.log('[Session Callback] ExaminerId from token:', token.examinerId);
        }

        console.log('[Session Callback] Role from token:', token.role);
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