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
          console.log('Naver profile data:', JSON.stringify(profile, null, 2));
          return {
            id: profile.response?.id,
            name: profile.response?.name || profile.response?.nickname,
            email: profile.response?.email,
            image: profile.response?.profile_image,
            mobile: profile.response?.mobile || profile.response?.mobile_e164,
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
    async jwt({ token, user, account, profile, trigger }) {
      /**
       * JWT 콜백 - 매 요청마다 실행되어 토큰 갱신
       *
       * @purpose 사용자 role을 실시간으로 MongoDB에서 조회하여 권한 변경 즉시 반영
       * @context trigger 파라미터로 콜백 실행 원인 파악 가능
       */
      const callStart = Date.now();

      try {
        console.log('[JWT Callback] Started -', {
          trigger,
          hasUser: !!user,
          hasAccount: !!account,
          email: token.email || user?.email,
          existingRole: token.role
        });

        // 초기 로그인 시 - user 객체에서 기본 정보 설정
        if (user) {
          token.id = user.id;
          token.email = user.email;
          token.name = user.name;
          token.role = user.role || UserRole.USER;
          token.mobile = user.mobile;

          console.log('[JWT Callback] Initial login - user data:', {
            id: user.id,
            email: user.email,
            role: user.role
          });
        }

        // 🔥 핵심: 모든 경우에 MongoDB에서 최신 role 조회 (초기 로그인 포함)
        // 이렇게 해야 role 변경이 즉시 반영됨
        if (token.email) {
          try {
            const client = await clientPromise;
            const db = client.db('naraddon');

            console.log('[JWT Callback] Fetching latest role from DB for:', token.email);

            const dbUser = await db.collection('users').findOne(
              { email: token.email as string },
              { projection: { role: 1, mobile: 1, _id: 1, name: 1 } }
            );

            if (dbUser) {
              const oldRole = token.role;
              const newRole = dbUser.role || UserRole.USER;

              token.role = newRole;
              token.id = token.id || dbUser._id.toString();

              if (dbUser.mobile) {
                token.mobile = dbUser.mobile;
              }

              console.log('[JWT Callback] DB role fetched:', {
                email: token.email,
                oldRole,
                newRole,
                changed: oldRole !== newRole,
                dbUserId: dbUser._id.toString()
              });
            } else {
              console.warn('[JWT Callback] User not found in DB:', token.email);
            }
          } catch (dbError) {
            console.error('[JWT Callback] DB query failed:', {
              email: token.email,
              error: dbError instanceof Error ? dbError.message : String(dbError),
              stack: dbError instanceof Error ? dbError.stack : undefined
            });
            // DB 조회 실패 시 기존 토큰 role 유지 (안정성)
          }
        }

        if (account) {
          token.provider = account.provider;
        }

        // Naver profile에서 전화번호 추가
        if (account?.provider === 'naver' && profile) {
          const naverProfile = profile as any;
          const mobile = naverProfile.response?.mobile || naverProfile.response?.mobile_e164;
          if (mobile) {
            token.mobile = mobile;
            console.log('[JWT Callback] Mobile from Naver profile:', mobile);
          }
        }

        const duration = Date.now() - callStart;
        console.log('[JWT Callback] Completed -', {
          email: token.email,
          finalRole: token.role,
          duration: `${duration}ms`
        });

        return token;
      } catch (error) {
        console.error('[JWT Callback] Fatal error:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
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

      try {
        if (account && user.email) {
          const client = await clientPromise;
          const db = client.db('naraddon');

          // 모든 로그인 시 lastLoginAt 업데이트
          // $setOnInsert: 신규 생성 시에만 createdAt 설정 (기존 문서에는 영향 없음)
          await db.collection('users').updateOne(
            { email: user.email },
            {
              $set: {
                lastLoginAt: new Date(),
                updatedAt: new Date()
              },
              $setOnInsert: {
                createdAt: new Date()
              }
            },
            { upsert: true }
          );
          console.log('✅ Last login time updated:', user.email);

          // 네이버 로그인 시 전화번호 정보 저장
          if (account.provider === 'naver' && profile) {
            const naverProfile = profile as any;
            const mobile = naverProfile.response?.mobile || naverProfile.response?.mobile_e164;

            if (mobile) {
              // users 컬렉션에 mobile 필드 업데이트
              await db.collection('users').updateOne(
                { email: user.email },
                {
                  $set: {
                    mobile: mobile,
                    updatedAt: new Date()
                  },
                  $setOnInsert: {
                    createdAt: new Date()
                  }
                },
                { upsert: true }
              );
              console.log('✅ Mobile number saved:', mobile);
            }
          }

          // 기존 계정이 있는지 확인 (accounts collection에서 확인)
          const existingAccount = await db.collection('accounts').findOne({
            provider: account.provider,
            providerAccountId: account.providerAccountId
          });

          // 계정이 없다면 신규 가입자
          if (!existingAccount) {
            console.log('🎉 New user registration detected:', user.email);

            // Telegram 알림 발송 (비동기, 실패해도 로그인 진행)
            fetch(`${process.env.NEXTAUTH_URL || ''}/api/telegram-notify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: `🎉 신규 회원 가입\n\n👤 이름: ${user.name || '미제공'}\n📧 이메일: ${user.email}\n🔑 가입 경로: ${account.provider}\n⏰ ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
                type: 'success'
              })
            }).catch(err => console.error('Telegram notification failed:', err));

            // 관리자 알림 발송
            fetch(`${process.env.NEXTAUTH_URL || ''}/api/notifications/new-user`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: user.name,
                email: user.email,
                provider: account.provider,
                registeredAt: new Date().toISOString(),
                notifyAdmin: true
              })
            }).catch(err => console.error('Admin notification failed:', err));

            // 신규 가입자 환영 이메일 발송
            fetch(`${process.env.NEXTAUTH_URL || ''}/api/notifications/welcome-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: user.name,
                email: user.email,
                provider: account.provider
              })
            }).catch(err => console.error('Welcome email failed:', err));
          }
        }
      } catch (error) {
        console.error('SignIn callback notification error:', error);
        // 알림 실패해도 로그인은 계속 진행
      }

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