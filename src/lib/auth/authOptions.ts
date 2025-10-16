import { NextAuthOptions } from 'next-auth';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import clientPromise from '@/lib/mongodb-client';
import NaverProvider from 'next-auth/providers/naver';
import GoogleProvider from 'next-auth/providers/google';
import KakaoProvider from 'next-auth/providers/kakao';
import { UserRole } from '@/types/user.types';
import { redis, RedisKeys, RedisTTL } from '@/lib/redis';

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
    async jwt({ token, user, account, profile }) {
      try {
        if (user) {
          // MongoDB Adapter는 ObjectId를 반환할 수 있으므로 명시적으로 string 변환
          token.id = user.id?.toString() || user.id;
          token.role = user.role || UserRole.USER;
          token.mobile = user.mobile;

          console.log('[JWT] User ID set:', token.id);
        }
        if (account) {
          token.provider = account.provider;
        }
        // Naver profile에서 전화번호 추가
        if (account?.provider === 'naver' && profile) {
          const naverProfile = profile as any;
          token.mobile = naverProfile.response?.mobile || naverProfile.response?.mobile_e164;
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
          // 1. token에서 userId 추출
          let userId = token.id?.toString() || (token.id as string) || '';

          // 2. userId가 빈 문자열이면 Redis 캐시 → DB 조회로 복구
          if (!userId && session.user.email) {
            const email = session.user.email.toLowerCase();
            const cacheKey = RedisKeys.recoveredUserId(email);
            const lockKey = RedisKeys.recoveryLock(email);

            try {
              // 2-1. Redis 캐시 확인
              if (redis) {
                const cached = await redis.get(cacheKey);
                if (cached) {
                  userId = cached;
                  if (!isProduction) {
                    console.log(`[Session] userId loaded from cache: ${email.substring(0, 3)}***`);
                  }
                }
              }

              // 2-2. 캐시 미스 → DB 조회 (스탬피드 방지)
              if (!userId) {
                let shouldQuery = true;
                let lockToken: string | null = null;

                // 락 획득 시도 (Redis 사용 가능한 경우만)
                if (redis) {
                  // UUID 토큰 생성 (다른 프로세스의 락과 구분)
                  lockToken = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

                  const lockAcquired = await redis.set(lockKey, lockToken, {
                    nx: true,
                    ex: RedisTTL.recoveryLock
                  });

                  if (!lockAcquired) {
                    // 다른 프로세스가 조회 중 → 50ms 대기 후 캐시 재확인
                    await new Promise(r => setTimeout(r, 50));
                    const retried = await redis.get(cacheKey);
                    if (retried) {
                      userId = retried;
                      shouldQuery = false;
                    }
                  }
                }

                // DB 조회 (락을 획득했거나 Redis 미사용 시)
                if (shouldQuery) {
                  try {
                    const client = await clientPromise;
                    const db = client.db('naraddon');
                    const user = await db.collection('users').findOne({ email: session.user.email });

                    if (user && user._id) {
                      userId = user._id.toString();

                      // Redis 캐시에 저장
                      if (redis) {
                        await redis.set(cacheKey, userId, { ex: RedisTTL.recoveredUserId });
                      }

                      if (!isProduction) {
                        console.log(`[Session] Recovered userId from DB: ${email.substring(0, 3)}***`);
                      }
                    }
                  } finally {
                    // 락 해제 (Lua script로 안전하게 - 자신의 락만 삭제)
                    if (redis && lockToken) {
                      try {
                        const luaScript = `
                          if redis.call("GET", KEYS[1]) == ARGV[1] then
                            return redis.call("DEL", KEYS[1])
                          else
                            return 0
                          end
                        `;
                        await redis.eval(luaScript, 1, lockKey, lockToken);
                      } catch (error) {
                        console.error('[Session] Lock release failed:', error);
                        // 락 해제 실패해도 TTL로 자동 해제됨
                      }
                    }
                  }
                }
              }
            } catch (recoveryError) {
              console.error('[Session] userId recovery error:', recoveryError);
              // 복구 실패해도 계속 진행 (빈 userId로)
            }
          }

          session.user.id = userId;
          session.user.role = token.role as UserRole;
          session.user.mobile = token.mobile as string;
          session.user.provider = token.provider as string;

          if (!isProduction && userId) {
            console.log('[Session] User ID:', userId.substring(0, 8) + '...', 'Role:', session.user.role);
          }
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